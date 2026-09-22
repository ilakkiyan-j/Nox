import { Router, Request, Response } from 'express';
import { db } from '@nox/database';
import { apiError, apiResponse } from '../lib/http';

const publicRouter = Router();
const privateRouter = Router();
const COUNCIL_API_URL = process.env.COUNCIL_API_URL || 'http://localhost:4100';

/**
 * GET /api/v1/council/status
 * Public healthcheck ping to Council server
 */
publicRouter.get('/council/status', async (_req: Request, res: Response) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

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
 * Main proxy chat endpoint that enriches the conversation with current user context
 */
privateRouter.post('/council/chat', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { message, persona = 'sofi', sessionId = `user_${userId}` } = req.body;

    if (!message || typeof message !== 'string') {
      return apiError(res, 'Message text is required', 400);
    }

    // Fetch user context across Nox
 // Update the Promise.all in POST /api/v1/council/chat to also include goals, roadmaps, and learnings:
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

const userContext = {
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


    // Forward to Council
    const authHeader = req.headers.authorization || '';

    const councilResponse = await fetch(`${COUNCIL_API_URL}/api/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        persona,
        message,
        sessionId,
        userContext,
      }),
    });

    const councilData = await councilResponse.json();

    if (!councilResponse.ok) {
      const errMsg = councilData?.error?.message || 'Council server encountered an error';
      return apiError(res, errMsg, councilResponse.status);
    }

    return apiResponse(res, councilData.data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to communicate with Council';
    return apiError(res, message, 500);
  }
});

export { publicRouter as councilPublicRouter, privateRouter as councilPrivateRouter };
