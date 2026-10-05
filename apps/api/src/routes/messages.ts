import { Router, Request, Response } from 'express';
import { db } from '@nox/database';
import { apiError, apiResponse, HttpError } from '../lib/http';
import { getOwnedMessage } from '../lib/ownership';
import { isSafeString, limitString, parseSafeUrl } from '../lib/validate';

export const messagesPublicRouter = Router();
export const messagesPrivateRouter = Router();
const router = messagesPrivateRouter;

import { COUNCIL_API_URL, getUserCouncilContext } from './council';

// POST /api/v1/messages/telegram — Public Telegram Webhook Endpoint (Supports ?persona=sofi or custom bot)
messagesPublicRouter.post('/messages/telegram', async (req: Request, res: Response) => {
  try {
    const update = req.body ?? {};
    const msg = update?.message || update?.channel_post || update?.edited_message;
    if (!msg) {
      return res.status(200).json({ ok: true });
    }

    const isVoice = Boolean(msg.voice || msg.audio);
    const text = typeof msg.text === 'string' ? msg.text : typeof msg.caption === 'string' ? msg.caption : '';
    if (!text && !msg.document && !msg.photo && !isVoice) {
      return res.status(200).json({ ok: true });
    }

    // Determine target persona (defaults to sofi if direct chat or /sofi or voice note)
    let requestedPersona = (req.query.persona as string) || (req.query.bot as string) || '';
    if (!requestedPersona && (isVoice || text.startsWith('/sofi') || msg.chat?.type === 'private')) {
      requestedPersona = 'sofi';
    }

    // Identify user: prioritize real user account (e.g. non-internal email) or most recent active user
    let user = await db.user.findFirst({
      where: {
        NOT: { email: { endsWith: '@nox.internal' } },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true },
    });
    if (!user) {
      user = await db.user.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true },
      });
    }

    if (!user) {
      return res.status(200).json({ ok: true });
    }

    // Resolve bot token dynamically from Council backend
    let botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    if (requestedPersona) {
      try {
        const botInfoRes = await fetch(`${COUNCIL_API_URL}/api/v1/bots/slug/${encodeURIComponent(requestedPersona.toLowerCase())}`, {
          headers: { 'X-User-Id': user.id },
        });
        if (botInfoRes.ok) {
          const botJson = (await botInfoRes.json()) as any;
          if (botJson?.data?.telegramBotToken) {
            botToken = botJson.data.telegramBotToken;
          }
        }
      } catch (err) {
        console.warn('Could not fetch dynamic bot token for persona:', requestedPersona);
      }
    }

    // Extract sender name
    const senderName = msg.from
      ? [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ') || msg.from.username || 'Telegram User'
      : msg.chat?.title || 'Telegram';

    // ---- 1. If Voice Message from Telegram User ----
    if (isVoice && requestedPersona) {
      try {
        const fileId = msg.voice?.file_id || msg.audio?.file_id;
        let audioBase64 = '';

        if (fileId && botToken) {
          // Get file path from Telegram API
          const fileInfoRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
          const fileInfo = (await fileInfoRes.json()) as any;
          if (fileInfo?.ok && fileInfo.result?.file_path) {
            const telegramAudioUrl = `https://api.telegram.org/file/bot${botToken}/${fileInfo.result.file_path}`;
            console.log(`[Telegram Voice Ingest] Downloading voice note from ${telegramAudioUrl}...`);
            const audioFetch = await fetch(telegramAudioUrl);
            if (audioFetch.ok) {
              const audioArr = await audioFetch.arrayBuffer();
              audioBase64 = Buffer.from(audioArr).toString('base64');
            }
          }
        }

        const userContext = await getUserCouncilContext(user.id);
        const councilRes = await fetch(`${COUNCIL_API_URL}/api/v1/voice/call-turn`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': user.id,
          },
          body: JSON.stringify({
            persona: requestedPersona.toLowerCase(),
            botId: requestedPersona.toLowerCase(),
            message: text || undefined,
            audioBase64: audioBase64 || undefined,
            mimeType: 'audio/ogg',
            conversationId: `telegram_${msg.chat.id}`,
            userContext,
          }),
        });

        const councilData = await councilRes.json().catch(() => ({}));
        const replyText = councilData?.data?.spokenText || councilData?.data?.replyText || "Hey Ilakkiyan! I heard your voice note. I'm right here with you!";
        let audioUrl = councilData?.data?.audioUrl;
        if (audioUrl && audioUrl.startsWith('/')) {
          audioUrl = `${COUNCIL_API_URL}${audioUrl}`;
        }

        if (msg.chat?.id) {
          if (audioUrl && botToken) {
            // Send Voice Audio Note back to Telegram!
            try {
              await fetch(`https://api.telegram.org/bot${botToken}/sendVoice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: msg.chat.id,
                  voice: audioUrl,
                  caption: replyText,
                }),
              });
              return res.status(200).json({ ok: true });
            } catch (vErr) {
              console.warn('sendVoice failed, falling back to sendMessage:', vErr);
            }
          }

          return res.status(200).json({
            method: 'sendMessage',
            chat_id: msg.chat.id,
            text: replyText,
          });
        }
      } catch (voiceErr) {
        console.error('Telegram voice processing error:', voiceErr);
        if (msg.chat?.id) {
          return res.status(200).json({
            method: 'sendMessage',
            chat_id: msg.chat.id,
            text: "I received your voice note! My synthesizer is tuning up, message me again in a moment.",
          });
        }
      }
      return res.status(200).json({ ok: true });
    }

    // ---- 2. If Text routed to an AI Persona (e.g. Sofi) ----
    if (requestedPersona) {
      const cleanPrompt = text.replace(/^\/sofi\s*/i, '').trim() || text;

      try {
        const userContext = await getUserCouncilContext(user.id);
        const councilRes = await fetch(`${COUNCIL_API_URL}/api/v1/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': user.id,
          },
          body: JSON.stringify({
            persona: requestedPersona.toLowerCase(),
            botId: requestedPersona.toLowerCase(),
            message: cleanPrompt,
            sessionId: `telegram_${msg.chat.id}`,
            userContext,
          }),
        });

        const councilData = await councilRes.json().catch(() => ({}));
        const replyText =
          councilData?.data?.reply ||
          councilData?.reply ||
          `Hi ${user.name || 'there'}! I'm connected to your NOX OS. How can I help you today?`;

        if (msg.chat?.id) {
          return res.status(200).json({
            method: 'sendMessage',
            chat_id: msg.chat.id,
            text: replyText,
          });
        }
      } catch (aiErr) {
        console.error('Council AI Error in Telegram Webhook:', aiErr);
        if (msg.chat?.id) {
          return res.status(200).json({
            method: 'sendMessage',
            chat_id: msg.chat.id,
            text: "I'm waking up my Council brain. Please give me a moment and message me again!",
          });
        }
      }
      return res.status(200).json({ ok: true });
    }

    // ---- 2. Standard Message / Share Ingest Mode ----
    let validatedUrl: string | null = null;
    if (text) {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const match = urlRegex.exec(String(text));
      if (match) {
        const urlCheck = parseSafeUrl(match[0]);
        if (urlCheck.ok) {
          validatedUrl = urlCheck.value ?? null;
        }
      }
    }

    const content = text || (msg.document ? `[Document: ${msg.document.file_name || 'file'}]` : '[Photo/Media]');

    await db.message.create({
      data: {
        userId: user.id,
        content: limitString(content.trim(), 10000),
        source: 'TELEGRAM',
        sender: limitString(senderName, 100),
        url: validatedUrl,
        metadata: JSON.stringify(update),
      },
    });

    if (msg.chat?.id) {
      return res.status(200).json({
        method: 'sendMessage',
        chat_id: msg.chat.id,
        text: '✅ Saved to NOX Messages!',
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Telegram webhook error:', err);
    return res.status(200).json({ ok: true });
  }
});

// GET /api/v1/messages — list messages
router.get('/messages', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { source, isArchived, isStarred, search } = req.query;

    const where: any = { userId };

    if (source && typeof source === 'string' && source !== 'ALL') {
      where.source = source.toUpperCase();
    }

    if (isArchived !== undefined) {
      where.isArchived = isArchived === 'true';
    } else {
      where.isArchived = false; // default to active messages
    }

    if (isStarred === 'true') {
      where.isStarred = true;
    }

    if (search && typeof search === 'string' && search.trim()) {
      where.OR = [
        { content: { contains: search.trim(), mode: 'insensitive' } },
        { sender: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const messages = await db.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return apiResponse(res, messages);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load messages';
    return apiError(res, message, 500);
  }
});

// POST /api/v1/messages — ingest message (from iOS Shortcuts, Android, Webhooks, etc.)
router.post('/messages', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { content, source, sender, url, metadata } = (req.body ?? {}) as Record<string, unknown>;

    if (!isSafeString(content)) {
      return apiError(res, 'Message content is required');
    }

    const rawUrl = typeof url === 'string' ? url.trim() : null;
    let validatedUrl: string | null = null;
    if (rawUrl) {
      const urlCheck = parseSafeUrl(rawUrl);
      if (urlCheck.ok) {
        validatedUrl = urlCheck.value ?? null;
      }
    }

    // Auto extract URL if content is a URL or contains one and url field wasn't explicitly given
    if (!validatedUrl) {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const match = urlRegex.exec(String(content));
      if (match) {
        const urlCheck = parseSafeUrl(match[0]);
        if (urlCheck.ok) {
          validatedUrl = urlCheck.value ?? null;
        }
      }
    }

    const validSource = typeof source === 'string' && source.trim() ? source.trim().toUpperCase() : 'WHATSAPP';
    const validSender = typeof sender === 'string' && sender.trim() ? limitString(sender.trim(), 100) : 'WhatsApp Share';

    const message = await db.message.create({
      data: {
        userId,
        content: limitString(String(content).trim(), 10000),
        source: validSource,
        sender: validSender,
        url: validatedUrl,
        metadata: typeof metadata === 'object' && metadata !== null ? JSON.stringify(metadata) : typeof metadata === 'string' ? metadata : '{}',
      },
    });

    return apiResponse(res, message, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create message';
    return apiError(res, message, 500);
  }
});

// POST /api/v1/messages/:id/convert — 1-Click convert message to Task or Note
router.post('/messages/:id/convert', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const target = await getOwnedMessage(id, userId);

    const { targetType, title, priority, dueDate } = (req.body ?? {}) as Record<string, unknown>;
    const type = typeof targetType === 'string' ? targetType.toUpperCase() : 'TASK';

    if (type === 'TASK') {
      // First line or up to 80 chars as task title
      const derivedTitle = isSafeString(title)
        ? limitString(String(title).trim(), 200)
        : limitString(target.content.split('\n')[0].replace(/^[•\-\*]\s*/, '').trim(), 150) || 'Task from WhatsApp';

      const task = await db.task.create({
        data: {
          userId,
          title: derivedTitle,
          description: target.content,
          priority: typeof priority === 'string' && ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority.toUpperCase()) ? priority.toUpperCase() : 'MEDIUM',
          dueDate: dueDate ? new Date(String(dueDate)) : null,
          status: 'TODO',
        },
      });

      const updated = await db.message.update({
        where: { id },
        data: {
          convertedType: 'TASK',
          convertedId: task.id,
        },
      });

      return apiResponse(res, { message: updated, createdEntity: task, type: 'TASK' });
    } else if (type === 'NOTE') {
      const derivedTitle = isSafeString(title)
        ? limitString(String(title).trim(), 200)
        : limitString(target.content.split('\n')[0].replace(/^[•\-\*]\s*/, '').trim(), 100) || 'Shared Message Note';

      const note = await db.note.create({
        data: {
          userId,
          title: derivedTitle,
          content: target.content,
          url: target.url,
          tags: JSON.stringify(['inbox', target.source.toLowerCase()]),
        },
      });

      const updated = await db.message.update({
        where: { id },
        data: {
          convertedType: 'NOTE',
          convertedId: note.id,
        },
      });

      return apiResponse(res, { message: updated, createdEntity: note, type: 'NOTE' });
    } else {
      return apiError(res, 'targetType must be TASK or NOTE', 400);
    }
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to convert message';
    return apiError(res, message, 500);
  }
});

// PATCH /api/v1/messages/:id — toggle star / archive
router.patch('/messages/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    await getOwnedMessage(id, userId);

    const { isStarred, isArchived } = (req.body ?? {}) as Record<string, unknown>;
    const data: any = {};
    if (isStarred !== undefined) data.isStarred = Boolean(isStarred);
    if (isArchived !== undefined) data.isArchived = Boolean(isArchived);

    const updated = await db.message.update({
      where: { id },
      data,
    });

    return apiResponse(res, updated);
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to update message';
    return apiError(res, message, 500);
  }
});

// DELETE /api/v1/messages/:id — delete message
router.delete('/messages/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    await getOwnedMessage(id, userId);

    await db.message.delete({ where: { id } });
    return apiResponse(res, { id, deleted: true });
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to delete message';
    return apiError(res, message, 500);
  }
});

export default router;
