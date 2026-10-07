import { Router, Request, Response } from 'express';
import { db } from '@nox/database';
import { apiError, apiResponse } from '../lib/http';
import { signToken } from '../lib/auth';

const publicRouter = Router();
const privateRouter = Router();
export const COUNCIL_API_URL = (process.env.COUNCIL_API_URL || 'http://localhost:4100').replace(/\/+$/, '');

/**
 * Builds the Authorization header for upstream Council calls.
 * If the current request is authenticated via Nox session (req.user),
 * issues a fresh, cryptographically valid token signed with the active JWT_SECRET.
 */
function getCouncilAuthHeader(req: Request): string {
  if (req.user) {
    try {
      const freshToken = signToken(req.user as any);
      return `Bearer ${freshToken}`;
    } catch {
      // fallback to incoming authorization header
    }
  }
  return (req.headers.authorization as string) || '';
}

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
export async function getUserCouncilContext(userId: string) {
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

    const councilResponse = await fetch(`${COUNCIL_API_URL}/api/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getCouncilAuthHeader(req),
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
        Authorization: getCouncilAuthHeader(req),
        'X-User-Id': userId,
      },
    });

    const data = await councilResponse.json().catch(() => null);
    if (!councilResponse.ok) {
      return apiError(res, data?.error?.message || 'Failed to load Council bots', mapCouncilStatus(councilResponse.status));
    }
    const bots = data?.data ?? data;
    if (!Array.isArray(bots)) {
      return apiError(res, 'Council returned an invalid bots response', 502);
    }
    return apiResponse(res, bots);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load Council bots';
    return apiError(res, message, 502);
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
        Authorization: getCouncilAuthHeader(req),
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
        Authorization: getCouncilAuthHeader(req),
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
        Authorization: getCouncilAuthHeader(req),
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
 * POST /api/v1/council/bots/:id/telegram/connect
 * Connect Telegram Bot Token via Council and auto-register webhook
 */
privateRouter.post('/council/bots/:id/telegram/connect', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const councilResponse = await fetch(`${COUNCIL_API_URL}/api/v1/bots/${encodeURIComponent(rawId)}/telegram/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getCouncilAuthHeader(req),
        'X-User-Id': userId,
      },
      body: JSON.stringify(req.body),
    });

    const data = await councilResponse.json().catch(() => ({}));
    if (!councilResponse.ok) {
      return apiError(res, data?.error?.message || 'Failed to connect Telegram Bot', mapCouncilStatus(councilResponse.status));
    }
    return apiResponse(res, data.data || data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to connect Telegram Bot';
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
        Authorization: getCouncilAuthHeader(req),
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
        Authorization: getCouncilAuthHeader(req),
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
        Authorization: getCouncilAuthHeader(req),
        'X-User-Id': userId,
      },
    });

    const data = await councilResponse.json().catch(() => null);
    if (!councilResponse.ok) {
      return apiError(res, data?.error?.message || 'Failed to load provider credentials', mapCouncilStatus(councilResponse.status));
    }
    const credentials = data?.data ?? data;
    if (!Array.isArray(credentials)) {
      return apiError(res, 'Council returned an invalid provider credentials response', 502);
    }
    return apiResponse(res, credentials);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load provider credentials';
    return apiError(res, message, 502);
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
        Authorization: getCouncilAuthHeader(req),
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
        Authorization: getCouncilAuthHeader(req),
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
    const authHeaders = {
      Authorization: getCouncilAuthHeader(req),
      'X-User-Id': userId,
    };

    let councilResponse = await fetch(`${COUNCIL_API_URL}/api/v1/sessions`, {
      headers: authHeaders,
    });
    let isLegacyResponse = true;

    if (!councilResponse.ok) {
      councilResponse = await fetch(`${COUNCIL_API_URL}/api/v1/conversations`, {
        headers: authHeaders,
      });
      isLegacyResponse = false;
    }

    const councilData = await councilResponse.json().catch(() => null);
    if (!councilResponse.ok) {
      return apiError(res, councilData?.error?.message || 'Failed to load Council sessions', mapCouncilStatus(councilResponse.status));
    }
    const sessions = councilData?.data ?? councilData;
    if (!Array.isArray(sessions)) {
      return apiError(res, 'Council returned an invalid sessions response', 502);
    }
    if (isLegacyResponse) {
      return apiResponse(res, sessions);
    }
    return apiResponse(res, sessions.map((c: any) => ({
      sessionId: c.id,
      personaId: c.bot?.slug || c.botId || 'sofi',
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messageCount: c._count?.messages ?? (c.messages?.length || 0),
      lastMessagePreview: c.title || (c.messages?.[c.messages.length - 1]?.content) || 'Chat conversation',
    })));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load Council sessions';
    return apiError(res, message, 502);
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
      Authorization: getCouncilAuthHeader(req),
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
      Authorization: getCouncilAuthHeader(req),
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

    if (!councilResponse) {
      return apiError(res, 'Failed to communicate with Council', 502);
    }
    const councilData = await councilResponse.json().catch(() => null);
    if (!councilResponse.ok) {
      return apiError(res, councilData?.error?.message || 'Failed to delete session', mapCouncilStatus(councilResponse.status));
    }
    return apiResponse(res, councilData?.data ?? councilData);
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
        Authorization: getCouncilAuthHeader(req),
        'X-User-Id': userId,
      },
    });

    const councilData = await councilResponse.json().catch(() => null);
    if (!councilResponse.ok) {
      return apiError(res, councilData?.error?.message || 'Failed to load Council memory', mapCouncilStatus(councilResponse.status));
    }
    const profile = councilData?.data ?? councilData;
    if (!profile || profile.userId !== userId || !Array.isArray(profile.facts)) {
      return apiError(res, 'Council returned an invalid memory profile', 502);
    }
    return apiResponse(res, profile);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load Council memory';
    return apiError(res, message, 502);
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
        Authorization: getCouncilAuthHeader(req),
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

    const councilResponse = await fetch(`${COUNCIL_API_URL}/api/v1/council/deliberate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getCouncilAuthHeader(req),
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
 * -----------------------------------------------------------------------------
 * Voice & Speech Synthesizer Endpoints
 * -----------------------------------------------------------------------------
 */

// GET /api/v1/voice/preferences
privateRouter.get('/voice/preferences', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const upstreamRes = await fetch(`${COUNCIL_API_URL}/api/v1/voice/preferences`, {
      headers: { Authorization: getCouncilAuthHeader(req), 'X-User-Id': userId },
    });
    const data = await upstreamRes.json().catch(() => ({}));
    if (!upstreamRes.ok) {
      return apiError(res, data?.error?.message || 'Failed to fetch voice preferences', mapCouncilStatus(upstreamRes.status));
    }
    return apiResponse(res, data.data || data);
  } catch (err: unknown) {
    return apiError(res, err instanceof Error ? err.message : 'Voice proxy error', 502);
  }
});

// PATCH /api/v1/voice/preferences
privateRouter.patch('/voice/preferences', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const upstreamRes = await fetch(`${COUNCIL_API_URL}/api/v1/voice/preferences`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: getCouncilAuthHeader(req), 'X-User-Id': userId },
      body: JSON.stringify(req.body),
    });
    const data = await upstreamRes.json().catch(() => ({}));
    if (!upstreamRes.ok) {
      return apiError(res, data?.error?.message || 'Failed to update voice preferences', mapCouncilStatus(upstreamRes.status));
    }
    return apiResponse(res, data.data || data);
  } catch (err: unknown) {
    return apiError(res, err instanceof Error ? err.message : 'Voice proxy error', 502);
  }
});

// GET /api/v1/voice/catalog
privateRouter.get('/voice/catalog', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const upstreamRes = await fetch(`${COUNCIL_API_URL}/api/v1/voice/catalog`, {
      headers: { Authorization: getCouncilAuthHeader(req), 'X-User-Id': userId },
    });
    const data = await upstreamRes.json().catch(() => ({}));
    if (!upstreamRes.ok) {
      return apiError(res, data?.error?.message || 'Failed to fetch voice catalog', mapCouncilStatus(upstreamRes.status));
    }
    return apiResponse(res, data.data || data);
  } catch (err: unknown) {
    return apiError(res, err instanceof Error ? err.message : 'Voice proxy error', 502);
  }
});

// POST /api/v1/voice/test
privateRouter.post('/voice/test', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const upstreamRes = await fetch(`${COUNCIL_API_URL}/api/v1/voice/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: getCouncilAuthHeader(req), 'X-User-Id': userId },
      body: JSON.stringify(req.body),
    });
    if (!upstreamRes.ok) {
      const data = await upstreamRes.json().catch(() => ({}));
      return apiError(res, data?.error?.message || 'Failed to generate voice sample', mapCouncilStatus(upstreamRes.status));
    }
    const data = await upstreamRes.json().catch(() => ({}));
    if (data.data?.audioUrl && data.data.audioUrl.startsWith('/')) {
      data.data.audioUrl = `${COUNCIL_API_URL}${data.data.audioUrl}`;
    }
    return apiResponse(res, data.data || data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate voice sample';
    return apiError(res, message, 502);
  }
});

// POST /api/v1/voice/call-turn
privateRouter.post('/voice/call-turn', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const userContext = await getUserCouncilContext(userId);
    const upstreamRes = await fetch(`${COUNCIL_API_URL}/api/v1/voice/call-turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: getCouncilAuthHeader(req), 'X-User-Id': userId },
      body: JSON.stringify({
        ...req.body,
        userContext,
      }),
    });
    const data = await upstreamRes.json().catch(() => ({}));
    if (!upstreamRes.ok) {
      return apiError(res, data?.error?.message || 'Voice call turn failed', mapCouncilStatus(upstreamRes.status));
    }
    if (data.data?.audioUrl && data.data.audioUrl.startsWith('/')) {
      data.data.audioUrl = `${COUNCIL_API_URL}${data.data.audioUrl}`;
    }
    return apiResponse(res, data.data || data);
  } catch (err: unknown) {
    return apiError(res, err instanceof Error ? err.message : 'Voice call turn error', 502);
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

// GET /api/v1/audio/:filename - Public audio proxy to Council
publicRouter.get('/audio/:filename', async (req: Request, res: Response) => {
  try {
    const filename = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
    const upstreamRes = await fetch(`${COUNCIL_API_URL}/audio/${encodeURIComponent(filename)}`);
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).send('Audio not found');
    }
    const contentType = upstreamRes.headers.get('content-type') || 'audio/mpeg';
    res.setHeader('Content-Type', contentType);
    const arrayBuffer = await upstreamRes.arrayBuffer();
    return res.status(200).send(Buffer.from(arrayBuffer));
  } catch (err: unknown) {
    return res.status(502).send('Failed to stream audio file');
  }
});

export { publicRouter as councilPublicRouter, privateRouter as councilPrivateRouter };
