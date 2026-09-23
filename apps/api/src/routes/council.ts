import { Router, Request, Response } from 'express';
import { db } from '@nox/database';
import { apiError, apiResponse } from '../lib/http';

const publicRouter = Router();
const privateRouter = Router();
const COUNCIL_API_URL = (process.env.COUNCIL_API_URL || 'http://localhost:4100').replace(/\/+$/, '');

/**
 * Maps upstream Council HTTP statuses so that upstream 401/403 errors NEVER
 * trigger a client-side logout in Nox. Upstream auth failures are converted to 502.
 */
function mapCouncilStatus(status: number): number {
  if (status === 401 || status === 403) return 502;
  return status >= 400 && status < 600 ? status : 500;
}

/**
 * Helper to fetch complete live Nox user context across all domains
 */
async function getUserCouncilContext(userId: string) {
  const [user, tasks, habits, events, reminders, goals, roadmaps, learnings] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
    db.task.findMany({ where: { userId, status: { in: ['TODO', 'IN_PROGRESS'] } }, orderBy: { dueDate: 'asc' }, take: 35 }),
    db.habit.findMany({ where: { userId }, select: { id: true, title: true, streakCount: true } }),
    db.event.findMany({ where: { userId }, orderBy: { date: 'asc' }, take: 50 }),
    db.reminder.findMany({ where: { userId, isCompleted: false }, orderBy: { remindAt: 'asc' }, take: 30 }),
    db.goal.findMany({ where: { userId, status: { in: ['IN_PROGRESS', 'NOT_STARTED'] } }, take: 15 }),
    db.roadmap.findMany({ where: { userId, status: 'IN_PROGRESS' }, take: 10, include: { milestones: true, goal: true } }),
    db.learning.findMany({ where: { userId, status: 'IN_PROGRESS' }, take: 10, include: { modules: true } }),
  ]);

  return {
    userId,
    userName: user?.name || 'Partner',
    localTime: new Date().toLocaleString(),
    activeTasksCount: tasks.length,
    tasks,
    habits,
    upcomingEvents: events,
    reminders,
    goals,
    roadmaps,
    learning: learnings,
  };
}

/**
 * Format & ensure user-scoped sessionId
 */
function ensureUserSessionId(userId: string, requestedSessionId?: string): string {
  const prefix = `user_${userId}_`;
  if (!requestedSessionId || requestedSessionId.trim() === '') {
    return `${prefix}session_${Date.now()}`;
  }
  if (requestedSessionId.startsWith(prefix)) {
    return requestedSessionId;
  }
  if (requestedSessionId === `user_${userId}`) {
    return requestedSessionId;
  }
  return `${prefix}${requestedSessionId}`;
}

/**
 * Probes Council health endpoint with timeout.
 */
async function probeCouncilHealth(timeoutMs: number = 5000): Promise<{ ok: boolean; data?: any; status?: number }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let res = await fetch(`${COUNCIL_API_URL}/health`, {
      signal: controller.signal,
    }).catch(() => null);

    if (!res || !res.ok) {
      res = await fetch(`${COUNCIL_API_URL}/api/v1/health`, {
        signal: controller.signal,
      }).catch(() => null);
    }

    clearTimeout(timeoutId);

    if (res && res.ok) {
      const data = await res.json().catch(() => ({ status: 'ok' }));
      return { ok: true, data, status: res.status };
    }
    return { ok: false, status: res?.status };
  } catch (_err) {
    return { ok: false };
  }
}

/**
 * GET /api/v1/council/status
 * Public healthcheck ping to Council server.
 * When ?wake=true is passed, actively polls every 2.5s for up to 50s to wait for Render cold boot.
 */
publicRouter.get('/council/status', async (req: Request, res: Response) => {
  const isWake = req.query.wake === 'true';
  const startTime = Date.now();

  if (!isWake) {
    const result = await probeCouncilHealth(8000);
    const latencyMs = Date.now() - startTime;
    if (result.ok) {
      return apiResponse(res, { online: true, latencyMs, ...result.data });
    }
    return apiResponse(res, {
      online: false,
      latencyMs,
      message: result.status ? `Council responded with HTTP ${result.status}` : 'Council service offline',
    });
  }

  // Active Wake loop: Render container cold start takes 25-40 seconds
  const maxWaitMs = 50000;
  const pollIntervalMs = 2500;
  let attempts = 0;

  while (Date.now() - startTime < maxWaitMs) {
    attempts++;
    const result = await probeCouncilHealth(4000);
    if (result.ok) {
      const totalTimeMs = Date.now() - startTime;
      return apiResponse(res, {
        online: true,
        latencyMs: totalTimeMs,
        attempts,
        woken: true,
        ...result.data,
      });
    }
    // Wait before next probe
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  const latencyMs = Date.now() - startTime;
  return apiResponse(res, {
    online: false,
    latencyMs,
    attempts,
    message: 'Timeout waiting for Council container to wake up (50s elapsed)',
  });
});

/**
 * GET /api/v1/council/ping
 * Dedicated ping endpoint returning live latency and status with optional wake loop
 */
publicRouter.get('/council/ping', async (req: Request, res: Response) => {
  const isWake = req.query.wake === 'true';
  const startTime = Date.now();

  if (!isWake) {
    const result = await probeCouncilHealth(8000);
    const latencyMs = Date.now() - startTime;
    return apiResponse(res, {
      online: result.ok,
      latencyMs,
      timestamp: new Date().toISOString(),
      ...(result.data || {}),
    });
  }

  // Wake loop for ping
  const maxWaitMs = 50000;
  const pollIntervalMs = 2500;
  let attempts = 0;

  while (Date.now() - startTime < maxWaitMs) {
    attempts++;
    const result = await probeCouncilHealth(4000);
    if (result.ok) {
      return apiResponse(res, {
        online: true,
        latencyMs: Date.now() - startTime,
        attempts,
        woken: true,
        timestamp: new Date().toISOString(),
        ...result.data,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return apiResponse(res, {
    online: false,
    latencyMs: Date.now() - startTime,
    attempts,
    timestamp: new Date().toISOString(),
    message: 'Council wake-up timed out after 50s',
  });
});

/**
 * POST /api/v1/council/chat
 * Primary chat endpoint proxying to Council with Nox live context
 */
privateRouter.post('/council/chat', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { message, persona = 'sofi', botId, sessionId: rawSessionId } = req.body;

    if (!message || typeof message !== 'string') {
      return apiError(res, 'Message text is required', 400);
    }

    const sessionId = ensureUserSessionId(userId, rawSessionId);
    const userContext = await getUserCouncilContext(userId);
    const authHeader = req.headers.authorization || '';

    const councilResponse = await fetch(`${COUNCIL_API_URL}/api/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
        'X-User-Id': userId,
      },
      body: JSON.stringify({
        persona,
        botId: botId || persona,
        message,
        sessionId,
        userContext,
      }),
    });

    const councilData = await councilResponse.json().catch(() => ({}));

    if (!councilResponse.ok) {
      const errMsg = councilData?.error?.message || 'Council server encountered an error';
      return apiError(res, errMsg, mapCouncilStatus(councilResponse.status));
    }

    return apiResponse(res, councilData.data || councilData);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to communicate with Council';
    return apiError(res, message, 502);
  }
});

/**
 * GET /api/v1/council/bots
 * List all custom and default bots for the current user
 */
privateRouter.get('/council/bots', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const councilResponse = await fetch(`${COUNCIL_API_URL}/api/v1/bots`, {
      headers: {
        Authorization: req.headers.authorization || '',
        'X-User-Id': userId,
      },
    });

    if (!councilResponse.ok) {
      return apiResponse(res, []);
    }

    const data = await councilResponse.json();
    return apiResponse(res, data.data || data || []);
  } catch (_err) {
    return apiResponse(res, []);
  }
});

/**
 * POST /api/v1/council/bots
 * Create a new custom AI Bot
 */
privateRouter.post('/council/bots', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const councilResponse = await fetch(`${COUNCIL_API_URL}/api/v1/bots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: req.headers.authorization || '',
        'X-User-Id': userId,
      },
      body: JSON.stringify(req.body),
    });

    const data = await councilResponse.json().catch(() => ({}));
    if (!councilResponse.ok) {
      return apiError(res, data?.error?.message || 'Failed to create bot', mapCouncilStatus(councilResponse.status));
    }
    return apiResponse(res, data.data || data, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create bot';
    return apiError(res, msg, 502);
  }
});

/**
 * GET /api/v1/council/bots/:id
 * Retrieve details for a specific Bot (including instruction prompt)
 */
privateRouter.get('/council/bots/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const councilResponse = await fetch(`${COUNCIL_API_URL}/api/v1/bots/${encodeURIComponent(rawId)}`, {
      headers: {
        Authorization: req.headers.authorization || '',
        'X-User-Id': userId,
      },
    });

    const data = await councilResponse.json().catch(() => ({}));
    if (!councilResponse.ok) {
      return apiError(res, data?.error?.message || 'Bot not found', mapCouncilStatus(councilResponse.status));
    }
    return apiResponse(res, data.data || data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve bot';
    return apiError(res, msg, 502);
  }
});

/**
 * PATCH /api/v1/council/bots/:id
 * Update any existing Bot (Sofi, Riven, Lucifer, or custom bots)
 */
privateRouter.patch('/council/bots/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const councilResponse = await fetch(`${COUNCIL_API_URL}/api/v1/bots/${encodeURIComponent(rawId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: req.headers.authorization || '',
        'X-User-Id': userId,
      },
      body: JSON.stringify(req.body),
    });

    const data = await councilResponse.json().catch(() => ({}));
    if (!councilResponse.ok) {
      return apiError(res, data?.error?.message || 'Failed to update bot', mapCouncilStatus(councilResponse.status));
    }
    return apiResponse(res, data.data || data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update bot';
    return apiError(res, msg, 502);
  }
});

/**
 * POST /api/v1/council/bots/:id/duplicate
 * Duplicate an existing Bot to experiment with prompts or roles
 */
privateRouter.post('/council/bots/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const councilResponse = await fetch(`${COUNCIL_API_URL}/api/v1/bots/${encodeURIComponent(rawId)}/duplicate`, {
      method: 'POST',
      headers: {
        Authorization: req.headers.authorization || '',
        'X-User-Id': userId,
      },
    });

    const data = await councilResponse.json().catch(() => ({}));
    if (!councilResponse.ok) {
      return apiError(res, data?.error?.message || 'Failed to duplicate bot', mapCouncilStatus(councilResponse.status));
    }
    return apiResponse(res, data.data || data, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to duplicate bot';
    return apiError(res, msg, 502);
  }
});

/**
 * DELETE /api/v1/council/bots/:id
 * Delete a custom bot
 */
privateRouter.delete('/council/bots/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const councilResponse = await fetch(`${COUNCIL_API_URL}/api/v1/bots/${encodeURIComponent(rawId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: req.headers.authorization || '',
        'X-User-Id': userId,
      },
    });

    const data = await councilResponse.json().catch(() => ({}));
    return apiResponse(res, data.data || data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete bot';
    return apiError(res, msg, 502);
  }
});

/**
 * GET /api/v1/council/provider-credentials
 * List connected BYOK credentials
 */
privateRouter.get('/council/provider-credentials', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const councilResponse = await fetch(`${COUNCIL_API_URL}/api/v1/provider-credentials`, {
      headers: {
        Authorization: req.headers.authorization || '',
        'X-User-Id': userId,
      },
    });

    let creds: any[] = [];
    if (councilResponse.ok) {
      const data = await councilResponse.json();
      creds = data.data || data || [];
    }

    // Workspace fallback: If 0 credentials found for this account, query primary owner
    if (creds.length === 0 && userId !== 'cmttwn1zg0000h4iajwvjrlf0') {
      const fallbackRes = await fetch(`${COUNCIL_API_URL}/api/v1/provider-credentials`, {
        headers: {
          Authorization: req.headers.authorization || '',
          'X-User-Id': 'cmttwn1zg0000h4iajwvjrlf0',
        },
      }).catch(() => null);

      if (fallbackRes && fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        creds = fallbackData.data || fallbackData || [];
      }
    }

    return apiResponse(res, creds);
  } catch (_err) {
    return apiResponse(res, []);
  }
});

/**
 * POST /api/v1/council/provider-credentials
 * Add or update an encrypted BYOK provider key
 */
privateRouter.post('/council/provider-credentials', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const councilResponse = await fetch(`${COUNCIL_API_URL}/api/v1/provider-credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: req.headers.authorization || '',
        'X-User-Id': userId,
      },
      body: JSON.stringify(req.body),
    });

    const data = await councilResponse.json().catch(() => ({}));
    if (!councilResponse.ok) {
      return apiError(res, data?.error?.message || 'Failed to save credential', mapCouncilStatus(councilResponse.status));
    }
    return apiResponse(res, data.data || data, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save credential';
    return apiError(res, msg, 502);
  }
});

/**
 * DELETE /api/v1/council/provider-credentials/:id
 * Revoke and delete a provider credential
 */
privateRouter.delete('/council/provider-credentials/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const councilResponse = await fetch(`${COUNCIL_API_URL}/api/v1/provider-credentials/${encodeURIComponent(rawId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: req.headers.authorization || '',
        'X-User-Id': userId,
      },
    });

    const data = await councilResponse.json().catch(() => ({}));
    return apiResponse(res, data.data || data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to revoke credential';
    return apiError(res, msg, 502);
  }
});

/**
 * GET /api/v1/council/sessions
 * List persisted chat sessions belonging to the current user
 */
privateRouter.get('/council/sessions', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const userPrefix = `user_${userId}`;
    const authHeaders = {
      Authorization: req.headers.authorization || '',
      'X-User-Id': userId,
    };

    // 1. Try legacy /api/v1/sessions
    let councilResponse = await fetch(`${COUNCIL_API_URL}/api/v1/sessions`, {
      headers: authHeaders,
    }).catch(() => null);

    if (councilResponse && councilResponse.ok) {
      const councilData = await councilResponse.json().catch(() => ({}));
      const allSessions: any[] = councilData?.data || [];
      const userSessions = allSessions.filter((s) => {
        return typeof s.sessionId === 'string' && (s.sessionId.startsWith(userPrefix) || s.sessionId === userPrefix || !s.sessionId.startsWith('user_'));
      });
      if (userSessions.length > 0) {
        return apiResponse(res, userSessions);
      }
    }

    // 2. Fallback to Council V2 /api/v1/conversations
    councilResponse = await fetch(`${COUNCIL_API_URL}/api/v1/conversations`, {
      headers: authHeaders,
    }).catch(() => null);

    if (councilResponse && councilResponse.ok) {
      const councilData = await councilResponse.json().catch(() => ({}));
      const conversations: any[] = councilData?.data || councilData || [];
      const mapped = conversations.map((c: any) => ({
        sessionId: c.id,
        personaId: c.bot?.slug || c.botId || 'sofi',
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        messageCount: c._count?.messages ?? (c.messages?.length || 0),
        lastMessagePreview: c.title || (c.messages?.[c.messages.length - 1]?.content) || 'Chat conversation',
      }));
      if (mapped.length > 0) {
        return apiResponse(res, mapped);
      }
    }

    // 3. Workspace fallback: If no sessions found for current account, check primary owner
    if (userId !== 'cmttwn1zg0000h4iajwvjrlf0') {
      const fallbackRes = await fetch(`${COUNCIL_API_URL}/api/v1/conversations`, {
        headers: {
          Authorization: req.headers.authorization || '',
          'X-User-Id': 'cmttwn1zg0000h4iajwvjrlf0',
        },
      }).catch(() => null);

      if (fallbackRes && fallbackRes.ok) {
        const fallbackData = await fallbackRes.json().catch(() => ({}));
        const conversations: any[] = fallbackData?.data || fallbackData || [];
        const mapped = conversations.map((c: any) => ({
          sessionId: c.id,
          personaId: c.bot?.slug || c.botId || 'sofi',
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          messageCount: c._count?.messages ?? (c.messages?.length || 0),
          lastMessagePreview: c.title || (c.messages?.[c.messages.length - 1]?.content) || 'Chat conversation',
        }));
        return apiResponse(res, mapped);
      }
    }

    return apiResponse(res, []);
  } catch (_err: unknown) {
    return apiResponse(res, []);
  }
});

/**
 * GET /api/v1/council/sessions/:id
 * Retrieve history for a specific session
 */
privateRouter.get('/council/sessions/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const authHeaders = {
      Authorization: req.headers.authorization || '',
      'X-User-Id': userId,
    };

    // 1. Try /api/v1/sessions/:id
    let councilResponse = await fetch(`${COUNCIL_API_URL}/api/v1/sessions/${encodeURIComponent(rawId)}`, {
      headers: authHeaders,
    }).catch(() => null);

    if (councilResponse && councilResponse.ok) {
      const councilData = await councilResponse.json().catch(() => ({}));
      return apiResponse(res, councilData.data || councilData);
    }

    // 2. Fallback to /api/v1/conversations/:id
    councilResponse = await fetch(`${COUNCIL_API_URL}/api/v1/conversations/${encodeURIComponent(rawId)}`, {
      headers: authHeaders,
    }).catch(() => null);

    if (councilResponse && councilResponse.ok) {
      const convData = await councilResponse.json().catch(() => ({}));
      const conv = convData.data || convData;
      return apiResponse(res, {
        sessionId: conv.id,
        personaId: conv.bot?.slug || conv.botId || 'sofi',
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        messages: (conv.messages || []).map((m: any) => ({
          id: m.id,
          sender: m.role === 'assistant' ? 'assistant' : 'user',
          persona: conv.bot?.slug || 'sofi',
          content: m.content,
          timestamp: m.createdAt,
          executedActions: m.toolCalls,
        })),
      });
    }

    // 3. Fallback check with workspace owner
    if (userId !== 'cmttwn1zg0000h4iajwvjrlf0') {
      const ownerRes = await fetch(`${COUNCIL_API_URL}/api/v1/conversations/${encodeURIComponent(rawId)}`, {
        headers: {
          Authorization: req.headers.authorization || '',
          'X-User-Id': 'cmttwn1zg0000h4iajwvjrlf0',
        },
      }).catch(() => null);

      if (ownerRes && ownerRes.ok) {
        const convData = await ownerRes.json().catch(() => ({}));
        const conv = convData.data || convData;
        return apiResponse(res, {
          sessionId: conv.id,
          personaId: conv.bot?.slug || conv.botId || 'sofi',
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          messages: (conv.messages || []).map((m: any) => ({
            id: m.id,
            sender: m.role === 'assistant' ? 'assistant' : 'user',
            persona: conv.bot?.slug || 'sofi',
            content: m.content,
            timestamp: m.createdAt,
            executedActions: m.toolCalls,
          })),
        });
      }
    }

    return apiError(res, 'Session not found', 404);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve session';
    return apiError(res, message, 502);
  }
});

/**
 * DELETE /api/v1/council/sessions/:id
 * Delete or clear a specific chat session
 */
privateRouter.delete('/council/sessions/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const authHeaders = {
      Authorization: req.headers.authorization || '',
      'X-User-Id': userId,
    };

    let councilResponse = await fetch(`${COUNCIL_API_URL}/api/v1/sessions/${encodeURIComponent(rawId)}`, {
      method: 'DELETE',
      headers: authHeaders,
    }).catch(() => null);

    if (!councilResponse || !councilResponse.ok) {
      councilResponse = await fetch(`${COUNCIL_API_URL}/api/v1/conversations/${encodeURIComponent(rawId)}`, {
        method: 'DELETE',
        headers: authHeaders,
      }).catch(() => null);
    }

    const councilData = councilResponse ? await councilResponse.json().catch(() => ({})) : { success: true };
    return apiResponse(res, councilData);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete session';
    return apiError(res, message, 502);
  }
});

/**
 * GET /api/v1/council/memory
 * Inspect permanent long-term user memory profile
 */
privateRouter.get('/council/memory', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const councilUserId = `user_${userId}`;

    const councilResponse = await fetch(`${COUNCIL_API_URL}/api/v1/memory?userId=${encodeURIComponent(councilUserId)}`, {
      headers: {
        Authorization: req.headers.authorization || '',
        'X-User-Id': userId,
      },
    });

    let profile: any = { userId, facts: [] };
    if (councilResponse.ok) {
      const councilData = await councilResponse.json();
      profile = councilData.data || councilData || { userId, facts: [] };
    }

    // Workspace fallback: If 0 facts found for this account, query primary owner
    if ((!profile.facts || profile.facts.length === 0) && userId !== 'cmttwn1zg0000h4iajwvjrlf0') {
      const fallbackRes = await fetch(`${COUNCIL_API_URL}/api/v1/memory?userId=user_cmttwn1zg0000h4iajwvjrlf0`, {
        headers: {
          Authorization: req.headers.authorization || '',
          'X-User-Id': 'cmttwn1zg0000h4iajwvjrlf0',
        },
      }).catch(() => null);

      if (fallbackRes && fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        const fallbackProfile = fallbackData.data || fallbackData;
        if (fallbackProfile && fallbackProfile.facts && fallbackProfile.facts.length > 0) {
          return apiResponse(res, fallbackProfile);
        }
      }
    }

    return apiResponse(res, profile);
  } catch (_err: unknown) {
    return apiResponse(res, { userId: req.user!.id, facts: [] });
  }
});

/**
 * POST /api/v1/council/memory
 * Add a fact to the permanent long-term memory vault
 */
privateRouter.post('/council/memory', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const councilUserId = `user_${userId}`;
    const { fact, category = 'general', sourcePersona } = req.body;

    if (!fact || typeof fact !== 'string') {
      return apiError(res, 'Fact string is required', 400);
    }

    const councilResponse = await fetch(`${COUNCIL_API_URL}/api/v1/memory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: req.headers.authorization || '',
        'X-User-Id': userId,
      },
      body: JSON.stringify({
        userId: councilUserId,
        fact,
        category,
        sourcePersona,
      }),
    });

    const councilData = await councilResponse.json().catch(() => ({}));
    if (!councilResponse.ok) {
      return apiError(res, councilData?.error?.message || 'Failed to add memory fact', mapCouncilStatus(councilResponse.status));
    }

    return apiResponse(res, councilData.data || councilData);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to add memory fact';
    return apiError(res, message, 502);
  }
});

/**
 * POST /api/v1/council/debate
 * Multi-Agent Deliberation Mode ("Summon the Council")
 */
privateRouter.post('/council/debate', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { topic } = req.body;

    if (!topic || typeof topic !== 'string') {
      return apiError(res, 'Debate topic is required', 400);
    }

    const userContext = await getUserCouncilContext(userId);
    const authHeader = req.headers.authorization || '';

    const councilResponse = await fetch(`${COUNCIL_API_URL}/api/v1/council/deliberate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
        'X-User-Id': userId,
      },
      body: JSON.stringify({
        topic,
        userContext,
      }),
    });

    const councilData = await councilResponse.json().catch(() => ({}));
    if (!councilResponse.ok) {
      const errMsg = councilData?.error?.message || 'Council debate failed';
      return apiError(res, errMsg, mapCouncilStatus(councilResponse.status));
    }

    return apiResponse(res, councilData.data || councilData);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to execute Council debate';
    return apiError(res, message, 502);
  }
});

/**
 * Starts an automated 10-minute background keep-alive heartbeat
 * to prevent Render free-tier containers from idling into sleep mode.
 */
export function startCouncilKeepAliveWorker(): NodeJS.Timeout {
  const intervalMs = 10 * 60 * 1000; // 10 minutes
  console.log(`[NOX Keep-Alive] Initializing Council heartbeat worker for ${COUNCIL_API_URL} (every 10m)...`);

  // Initial gentle wake on boot
  fetch(`${COUNCIL_API_URL}/health`).catch(() => {});

  const timer = setInterval(async () => {
    try {
      const res = await fetch(`${COUNCIL_API_URL}/health`);
      if (res.ok) {
        console.log(`[NOX Keep-Alive] Council ping successful at ${new Date().toLocaleTimeString()} (status: 200)`);
      }
    } catch (_err) {
      // Ignore background errors
    }
  }, intervalMs);

  return timer;
}

export { publicRouter as councilPublicRouter, privateRouter as councilPrivateRouter };
