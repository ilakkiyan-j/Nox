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
    db.task.findMany({ where: { userId, status: { in: ['TODO', 'IN_PROGRESS'] } }, orderBy: { dueDate: 'asc' }, take: 15 }),
    db.habit.findMany({ where: { userId }, select: { id: true, title: true, streakCount: true } }),
    db.event.findMany({ where: { userId }, orderBy: { date: 'asc' }, take: 4 }),
    db.reminder.findMany({ where: { userId, isCompleted: false }, orderBy: { remindAt: 'asc' }, take: 4 }),
    db.goal.findMany({ where: { userId, status: { in: ['IN_PROGRESS', 'NOT_STARTED'] } }, take: 8 }),
    db.roadmap.findMany({ where: { userId, status: 'IN_PROGRESS' }, take: 5, include: { milestones: true, goal: true } }),
    db.learning.findMany({ where: { userId, status: 'IN_PROGRESS' }, take: 5, include: { modules: true } }),
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
 * GET /api/v1/council/status
 * Public healthcheck ping to Council server
 */
publicRouter.get('/council/status', async (_req: Request, res: Response) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const councilRes = await fetch(`${COUNCIL_API_URL}/api/v1/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (councilRes.ok) {
      const data = await councilRes.json();
      return apiResponse(res, { online: true, ...data });
    }
    return apiResponse(res, { online: false, message: 'Council service responded with non-200' });
  } catch (_err) {
    return apiResponse(res, { online: false, message: 'Council service offline' });
  }
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

    const councilResponse = await fetch(`${COUNCIL_API_URL}/api/v1/sessions`, {
      headers: {
        Authorization: req.headers.authorization || '',
        'X-User-Id': userId,
      },
    });

    if (!councilResponse.ok) {
      // Graceful fallback to empty list if Council is unreachable or initial run
      return apiResponse(res, []);
    }

    const councilData = await councilResponse.json();
    const allSessions: any[] = councilData?.data || [];

    // Filter sessions owned by this user
    const userSessions = allSessions.filter((s) => {
      return typeof s.sessionId === 'string' && (s.sessionId.startsWith(userPrefix) || s.sessionId === userPrefix || !s.sessionId.startsWith('user_'));
    });

    return apiResponse(res, userSessions);
  } catch (_err: unknown) {
    // Return empty list gracefully instead of failing
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

    const councilResponse = await fetch(`${COUNCIL_API_URL}/api/v1/sessions/${encodeURIComponent(rawId)}`, {
      headers: {
        Authorization: req.headers.authorization || '',
        'X-User-Id': userId,
      },
    });

    const councilData = await councilResponse.json().catch(() => ({}));
    if (!councilResponse.ok) {
      return apiError(res, councilData?.error?.message || 'Session not found', mapCouncilStatus(councilResponse.status));
    }

    return apiResponse(res, councilData.data || councilData);
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

    const councilResponse = await fetch(`${COUNCIL_API_URL}/api/v1/sessions/${encodeURIComponent(rawId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: req.headers.authorization || '',
        'X-User-Id': userId,
      },
    });

    const councilData = await councilResponse.json().catch(() => ({}));
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

    if (!councilResponse.ok) {
      // Return empty facts fallback rather than crashing
      return apiResponse(res, { userId, facts: [] });
    }

    const councilData = await councilResponse.json();
    return apiResponse(res, councilData.data || councilData);
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

export { publicRouter as councilPublicRouter, privateRouter as councilPrivateRouter };
