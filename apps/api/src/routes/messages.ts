import { createHmac, timingSafeEqual } from 'crypto';
import jwt from 'jsonwebtoken';
import { Router, Request, Response } from 'express';
import { db } from '@nox/database';
import { apiError, apiResponse, HttpError } from '../lib/http';
import { parseDateInput } from '../lib/date-validation';
import { getOwnedMessage } from '../lib/ownership';
import { isSafeString, limitString, parseSafeUrl } from '../lib/validate';
import { formatMarkdownForTelegram, sendTelegramFormattedReply } from '../lib/telegramFormat';
import { COUNCIL_API_URL, getUserCouncilContext } from './council';

export const messagesPublicRouter = Router();
export const messagesPrivateRouter = Router();
const router = messagesPrivateRouter;

function telegramWebhookSecretForUser(userId: string, jwtSecret: string): string {
  return createHmac('sha256', jwtSecret).update(`telegram-webhook:${userId}`).digest('base64url');
}

function hasValidTelegramWebhookSecret(req: Request, userId: string, jwtSecret: string): boolean {
  const provided = req.get('x-telegram-bot-api-secret-token');
  if (!provided) return false;
  const expected = telegramWebhookSecretForUser(userId, jwtSecret);
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  return providedBytes.length === expectedBytes.length && timingSafeEqual(providedBytes, expectedBytes);
}

function createCouncilUserToken(userId: string, userName: string | null, jwtSecret: string): string {
  return jwt.sign(
    { sub: userId, role: 'USER', name: userName || 'Nox User' },
    jwtSecret,
    { algorithm: 'HS256', expiresIn: '2m' },
  );
}

function councilUserHeaders(userId: string, authorization?: string): Record<string, string> {
  return {
    ...(authorization ? { Authorization: authorization } : {}),
    'X-User-Id': userId,
  };
}

function isOwnerScopedTelegramWebhook(value: unknown, userId: string): boolean {
  if (typeof value !== 'string') return false;
  try {
    return new URL(value).searchParams.get('userId') === userId;
  } catch {
    return false;
  }
}

// POST /api/v1/messages/telegram — Public Telegram Webhook Endpoint (Supports forwarder mode, ?persona=sofi, or custom bots)
messagesPublicRouter.post('/messages/telegram', async (req: Request, res: Response) => {
  try {
    const jwtSecret = process.env.JWT_SECRET?.trim();
    if (!jwtSecret || jwtSecret.length < 32) {
      return apiError(res, 'Telegram webhook authentication is not configured', 503);
    }
    const webhookUserId = req.query.userId;
    if (
      typeof webhookUserId !== 'string' ||
      !webhookUserId ||
      !hasValidTelegramWebhookSecret(req, webhookUserId, jwtSecret)
    ) {
      return apiError(res, 'Invalid Telegram webhook authentication', 401);
    }

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

    // Determine Mode & Target Persona
    const isForwarderMode =
      req.query.mode === 'forwarder' ||
      req.query.type === 'forwarder' ||
      req.query.bot === 'forwarder' ||
      req.query.persona === 'forwarder';

    let requestedPersona = (req.query.persona as string) || (req.query.bot as string) || '';

    // Only fallback to Sofi if NOT in forwarder mode AND explicit command / voice directed
    if (!isForwarderMode && !requestedPersona && (text.startsWith('/sofi') || isVoice)) {
      requestedPersona = 'sofi';
    }

    const user = await db.user.findUnique({
      where: { id: webhookUserId },
      select: { id: true, name: true },
    });
    if (!user) {
      return apiError(res, 'Telegram webhook owner not found', 401);
    }
    const councilToken = createCouncilUserToken(user.id, user.name, jwtSecret);

    // Resolve the user's bot token dynamically from Council backend.
    let botToken = '';
    const targetSlug = isForwarderMode ? 'forwarder' : requestedPersona;

    if (targetSlug) {
      const botInfoRes = await fetch(`${COUNCIL_API_URL}/api/v1/bots/slug/${encodeURIComponent(targetSlug.toLowerCase())}`, {
        headers: councilUserHeaders(user.id, `Bearer ${councilToken}`),
      });
      const botJson = await botInfoRes.json().catch(() => null) as any;
      if (!botInfoRes.ok) {
        if (isForwarderMode && botInfoRes.status === 404) {
          return res.status(200).json({ ok: true });
        }
        return apiError(res, botJson?.error?.message || 'Could not load the configured Telegram bot', 502);
      }
      const botInfo = botJson?.data;
      if (!botInfo || typeof botInfo !== 'object') {
        return apiError(res, 'Council returned an invalid Telegram bot response', 502);
      }
      if (isForwarderMode && !isOwnerScopedTelegramWebhook(botInfo.telegramWebhookUrl, user.id)) {
        return res.status(200).json({ ok: true });
      }
      if (typeof botInfo.telegramBotToken === 'string') {
        botToken = botInfo.telegramBotToken;
      }
    }

    // Extract sender name
    const senderName = msg.from
      ? [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ') || msg.from.username || 'Telegram User'
      : msg.chat?.title || 'Telegram';

    // =========================================================================
    // CASE A: MESSAGE FORWARDER / SHARE INGEST MODE (Guaranteed No AI Hijack)
    // =========================================================================
    if (isForwarderMode || (!requestedPersona && !text.startsWith('/sofi'))) {
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
        if (botToken) {
          await sendTelegramFormattedReply(
            botToken,
            msg.chat.id,
            '✅ <b>Saved to NOX Inbox!</b>\n\nYour message, link, or media is safely indexed in your NOX workspace.'
          );
        } else {
          return res.status(200).json({
            method: 'sendMessage',
            chat_id: msg.chat.id,
            text: '✅ Saved to NOX Inbox!',
            parse_mode: 'HTML',
          });
        }
      }

      return res.status(200).json({ ok: true });
    }

    // =========================================================================
    // CASE B: VOICE NOTE INTERACTION FOR AI PERSONA
    // =========================================================================
    if (isVoice && requestedPersona) {
      try {
        const fileId = msg.voice?.file_id || msg.audio?.file_id;
        let audioBase64 = '';

        if (fileId && botToken) {
          const fileInfoRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
          const fileInfo = (await fileInfoRes.json()) as any;
          if (fileInfo?.ok && fileInfo.result?.file_path) {
            const telegramAudioUrl = `https://api.telegram.org/file/bot${botToken}/${fileInfo.result.file_path}`;
            console.log('[Telegram Voice Ingest] Downloading voice note from Telegram...');
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
            ...councilUserHeaders(user.id, `Bearer ${councilToken}`),
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
        const replyText = councilData?.data?.spokenText || councilData?.data?.replyText || "Hey! I heard your voice note. I'm right here with you!";
        let audioUrl = councilData?.data?.audioUrl;
        if (audioUrl && audioUrl.startsWith('/')) {
          audioUrl = `${COUNCIL_API_URL}${audioUrl}`;
        }

        if (msg.chat?.id) {
          if (audioUrl && botToken) {
            try {
              await fetch(`https://api.telegram.org/bot${botToken}/sendVoice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: msg.chat.id,
                  voice: audioUrl,
                  caption: replyText,
                  parse_mode: 'HTML',
                }),
              });
              return res.status(200).json({ ok: true });
            } catch (vErr) {
              console.warn('sendVoice failed, falling back to sendMessage:', vErr);
            }
          }

          if (botToken) {
            await sendTelegramFormattedReply(botToken, msg.chat.id, replyText);
          } else {
            return res.status(200).json({
              method: 'sendMessage',
              chat_id: msg.chat.id,
              text: formatMarkdownForTelegram(replyText),
              parse_mode: 'HTML',
            });
          }
        }
      } catch (voiceErr) {
        console.error('Telegram voice processing error:', voiceErr);
        if (msg.chat?.id) {
          if (botToken) {
            await sendTelegramFormattedReply(
              botToken,
              msg.chat.id,
              "I received your voice note! My synthesizer is tuning up, message me again in a moment."
            );
          } else {
            return res.status(200).json({
              method: 'sendMessage',
              chat_id: msg.chat.id,
              text: "I received your voice note! My synthesizer is tuning up, message me again in a moment.",
            });
          }
        }
      }
      return res.status(200).json({ ok: true });
    }

    // =========================================================================
    // CASE C: TEXT CHAT FOR AI PERSONA (With Full Telegram HTML Markdown Formatting)
    // =========================================================================
    if (requestedPersona) {
      const cleanPrompt = text.replace(/^\/sofi\s*/i, '').trim() || text;

      try {
        const userContext = await getUserCouncilContext(user.id);
        const councilRes = await fetch(`${COUNCIL_API_URL}/api/v1/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...councilUserHeaders(user.id, `Bearer ${councilToken}`),
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
          if (botToken) {
            await sendTelegramFormattedReply(botToken, msg.chat.id, replyText);
          } else {
            return res.status(200).json({
              method: 'sendMessage',
              chat_id: msg.chat.id,
              text: formatMarkdownForTelegram(replyText),
              parse_mode: 'HTML',
            });
          }
        }
      } catch (aiErr) {
        console.error('Council AI Error in Telegram Webhook:', aiErr);
        if (msg.chat?.id) {
          if (botToken) {
            await sendTelegramFormattedReply(
              botToken,
              msg.chat.id,
              "I'm waking up my Council brain. Please give me a moment and message me again!"
            );
          } else {
            return res.status(200).json({
              method: 'sendMessage',
              chat_id: msg.chat.id,
              text: "I'm waking up my Council brain. Please give me a moment and message me again!",
            });
          }
        }
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Telegram webhook error:', err);
    return res.status(500).json({ ok: false, description: 'Telegram update processing failed' });
  }
});

// POST /api/v1/messages/webhook — Authenticated ingestion for shortcuts and webhook clients
router.post('/messages/webhook', async (req: Request, res: Response) => {
  try {
    const { content, text, message, url, sender, source } = (req.body ?? {}) as Record<string, unknown>;
    const rawContent = (content || text || message || '') as string;

    if (!rawContent && !url) {
      return res.status(400).json({ success: false, error: 'Message text or url is required' });
    }

    const targetUserId = req.user!.id;

    const rawUrl = typeof url === 'string' ? url.trim() : null;
    let validatedUrl: string | null = null;
    if (rawUrl) {
      const urlCheck = parseSafeUrl(rawUrl);
      if (urlCheck.ok) {
        validatedUrl = urlCheck.value ?? null;
      }
    }

    const created = await db.message.create({
      data: {
        userId: targetUserId,
        content: limitString(String(rawContent || rawUrl).trim(), 10000),
        source: isSafeString(source) ? String(source).toUpperCase() : 'SHORTCUT',
        sender: isSafeString(sender) ? String(sender) : 'HTTP Shortcut',
        url: validatedUrl,
        metadata: JSON.stringify(req.body ?? {}),
      },
    });

    return res.status(201).json({ success: true, data: created });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Webhook ingestion failed';
    return res.status(500).json({ success: false, error: errorMsg });
  }
});


// =========================================================================
// FORWARDER BOT CONFIGURATION & WEBHOOK REGISTRATION ENDPOINTS
// =========================================================================

// POST /api/v1/messages/telegram/forwarder/connect — Test token, set webhook to mode=forwarder, save bot
router.post('/messages/telegram/forwarder/connect', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { token } = req.body ?? {};

    if (!token || typeof token !== 'string' || !token.includes(':')) {
      return apiError(res, 'A valid Telegram Bot Token from @BotFather is required.', 400);
    }

    const cleanToken = token.trim();

    // 1. Verify token with Telegram API
    const getMeRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
    const getMeData = (await getMeRes.json()) as any;

    if (!getMeData || !getMeData.ok || !getMeData.result?.username) {
      return apiError(
        res,
        `Invalid Telegram Bot Token: ${getMeData?.description || 'Unauthorized by Telegram.'}`,
        400
      );
    }

    const botUsername = getMeData.result.username;
    const botFirstName = getMeData.result.first_name || 'NOX Forwarder';

    // 2. Register Webhook pointing to ?mode=forwarder
    const noxApiBase = process.env.NOX_PUBLIC_API_URL || 'https://nox-a1nr.onrender.com';
    const webhookUrl = new URL('/api/v1/messages/telegram', noxApiBase);
    webhookUrl.searchParams.set('mode', 'forwarder');
    webhookUrl.searchParams.set('userId', userId);
    const jwtSecret = process.env.JWT_SECRET?.trim();
    if (!jwtSecret || jwtSecret.length < 32) {
      return apiError(res, 'Telegram webhook authentication is not configured', 503);
    }
    const webhookSecret = telegramWebhookSecretForUser(userId, jwtSecret);

    const setWebhookRes = await fetch(`https://api.telegram.org/bot${cleanToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl.toString(),
        secret_token: webhookSecret,
        allowed_updates: ['message', 'edited_message', 'channel_post'],
        drop_pending_updates: false,
      }),
    });
    const setWebhookData = (await setWebhookRes.json()) as any;
    if (!setWebhookRes.ok || !setWebhookData?.ok) {
      return apiError(
        res,
        setWebhookData?.description || 'Telegram rejected webhook registration',
        502,
      );
    }

    // 3. Persist Forwarder Bot to Council Bot Service / DB
    const councilResponse = await fetch(`${COUNCIL_API_URL}/api/v1/bots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...councilUserHeaders(userId, req.headers.authorization),
      },
      body: JSON.stringify({
        name: 'Telegram Forwarder & Ingest',
        slug: 'forwarder',
        role: 'Share Ingest & Inbox Forwarder',
        description: 'Dedicated bot for forwarding articles, links, and job postings into NOX Inbox',
        avatar: '📥',
        color: '#059669',
        telegramBotToken: cleanToken,
        telegramBotUsername: botUsername,
        telegramWebhookUrl: webhookUrl.toString(),
      }),
    });
    const councilData = await councilResponse.json().catch(() => null) as any;
    if (!councilResponse.ok) {
      await fetch(`https://api.telegram.org/bot${cleanToken}/deleteWebhook`).catch(() => undefined);
      return apiError(
        res,
        councilData?.error?.message || 'Council could not save the Telegram forwarder configuration',
        502,
      );
    }

    return apiResponse(res, {
      botUsername,
      botFirstName,
      webhookUrl: webhookUrl.toString(),
      telegramUrl: `https://t.me/${botUsername}`,
      webhookStatus: 'ACTIVE',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to connect Telegram Forwarder bot';
    return apiError(res, message, 500);
  }
});

// GET /api/v1/messages/telegram/forwarder/status — Get active forwarder bot status
router.get('/messages/telegram/forwarder/status', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const councilRes = await fetch(`${COUNCIL_API_URL}/api/v1/bots/slug/forwarder`, {
      headers: councilUserHeaders(userId, req.headers.authorization),
    });
    const json = await councilRes.json().catch(() => null) as any;
    if (!councilRes.ok) {
      return apiError(res, json?.error?.message || 'Could not query Council for the forwarder bot', 502);
    }
    const botInfo = json?.data ?? null;
    if (botInfo !== null && typeof botInfo !== 'object') {
      return apiError(res, 'Council returned an invalid forwarder bot response', 502);
    }

    return apiResponse(res, {
      isConfigured: Boolean(
        botInfo?.telegramBotTokenMasked &&
        botInfo?.telegramBotUsername &&
        isOwnerScopedTelegramWebhook(botInfo?.telegramWebhookUrl, userId),
      ),
      botUsername: botInfo?.telegramBotUsername || null,
      telegramBotTokenMasked: botInfo?.telegramBotTokenMasked || null,
      webhookUrl: botInfo?.telegramWebhookUrl || null,
      telegramUrl: botInfo?.telegramBotUsername ? `https://t.me/${botInfo.telegramBotUsername}` : null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to get forwarder status';
    return apiError(res, message, 500);
  }
});

// POST /api/v1/messages/telegram/forwarder/disconnect — Disconnect forwarder webhook
router.post('/messages/telegram/forwarder/disconnect', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const councilRes = await fetch(`${COUNCIL_API_URL}/api/v1/bots/slug/forwarder`, {
      headers: councilUserHeaders(userId, req.headers.authorization),
    });
    const json = await councilRes.json().catch(() => null) as any;
    if (!councilRes.ok) {
      return apiError(res, json?.error?.message || 'Could not fetch the forwarder bot to disconnect', 502);
    }
    const botInfo = json?.data ?? null;
    if (botInfo !== null && typeof botInfo !== 'object') {
      return apiError(res, 'Council returned an invalid forwarder bot response', 502);
    }

    if (botInfo?.id) {
      // Remove webhook from Telegram if token available
      try {
        const rawRes = await fetch(`${COUNCIL_API_URL}/api/v1/bots/${botInfo.id}`, {
          headers: councilUserHeaders(userId, req.headers.authorization),
        });
        const rawJson = (await rawRes.json()) as any;
        const fullToken = rawJson?.data?.telegramBotToken;
        if (fullToken && !fullToken.includes('••••')) {
          await fetch(`https://api.telegram.org/bot${fullToken}/deleteWebhook`);
        }
      } catch (tgErr) {
        console.warn('Failed to delete Telegram webhook:', tgErr);
      }

      // Delete/clear bot config in Council
      await fetch(`${COUNCIL_API_URL}/api/v1/bots/${botInfo.id}`, {
        method: 'DELETE',
        headers: councilUserHeaders(userId, req.headers.authorization),
      });
    }

    return apiResponse(res, { disconnected: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to disconnect forwarder bot';
    return apiError(res, message, 500);
  }
});

// =========================================================================
// STANDARD MESSAGES INBOX API ROUTES
// =========================================================================

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

    const safeSource = isSafeString(source) ? String(source).toUpperCase() : 'WHATSAPP';
    const safeSender = isSafeString(sender) ? String(sender) : 'Direct Share';

    const message = await db.message.create({
      data: {
        userId,
        content: limitString(String(content).trim(), 10000),
        source: safeSource,
        sender: limitString(safeSender, 100),
        url: validatedUrl,
        metadata: typeof metadata === 'object' && metadata !== null ? JSON.stringify(metadata) : '{}',
      },
    });

    return apiResponse(res, message, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save message';
    return apiError(res, message, 500);
  }
});

// POST /api/v1/messages/:id/convert — convert message into actionable Task or Note
router.post('/messages/:id/convert', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const target = await getOwnedMessage(id, userId);

    const { targetType, title, priority, dueDate } = (req.body ?? {}) as Record<string, unknown>;
    const type = typeof targetType === 'string' ? targetType.toUpperCase() : 'TASK';

    if (type === 'TASK') {
      const derivedTitle = isSafeString(title)
        ? limitString(String(title).trim(), 200)
        : limitString(target.content.split('\n')[0].replace(/^[•\-\*]\s*/, '').trim(), 150) || 'Task from WhatsApp';

      const task = await db.task.create({
        data: {
          userId,
          title: derivedTitle,
          description: target.content,
          priority: typeof priority === 'string' && ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority.toUpperCase()) ? priority.toUpperCase() : 'MEDIUM',
          dueDate: parseDateInput(dueDate, 'Task due date') ?? null,
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
