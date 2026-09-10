import { Router, Request, Response } from 'express';
import { db } from '@nox/database';
import { apiError, apiResponse } from '../lib/http';

const router = Router();

interface TextFilter {
  contains: string;
  mode?: 'insensitive';
}

router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!query) {
      return apiResponse(res, { goals: [], tasks: [], events: [], notes: [], learning: [] });
    }
    if (query.length > 100) {
      return apiError(res, 'Search query is too long (max 100 characters)', 400);
    }

    const userId = req.user!.id;
    const text: TextFilter = { contains: query, mode: 'insensitive' };

    const [goals, tasks, events, notes, learning] = await Promise.all([
      db.goal.findMany({
        where: { userId, OR: [{ title: text }, { description: text }] },
        take: 4,
        orderBy: { updatedAt: 'desc' },
      }),
      db.task.findMany({
        where: { userId, OR: [{ title: text }, { description: text }] },
        take: 4,
        orderBy: { updatedAt: 'desc' },
      }),
      db.event.findMany({
        where: { userId, OR: [{ title: text }, { description: text }] },
        take: 4,
        orderBy: { updatedAt: 'desc' },
      }),
      db.note.findMany({
        where: { userId, OR: [{ title: text }, { content: text }, { tags: text }] },
        take: 4,
        orderBy: { updatedAt: 'desc' },
        include: { folder: true },
      }),
      db.learning.findMany({
        where: { userId, OR: [{ title: text }, { type: text }] },
        take: 4,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return apiResponse(res, { goals, tasks, events, notes, learning });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Search failed';
    return apiError(res, message, 500);
  }
});

export default router;