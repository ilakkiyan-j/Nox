import { Router, Request, Response } from 'express';
import { db } from '@nox/database';
import { apiError, apiResponse, HttpError } from '../lib/http';
import { getOwnedGoal, validateGoalRelation } from '../lib/ownership';
import { GOAL_STATUSES, isSafeString, limitString } from '../lib/validate';

const router = Router();

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? null : d;
}

router.get('/goals', async (req: Request, res: Response) => {
  try {
    const goals = await db.goal.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: {
        roadmaps: { include: { milestones: true } },
        milestones: true,
        tasks: true,
        learnings: true,
        events: true,
        notes: true,
      },
    });
    return apiResponse(res, goals);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load goals';
    return apiError(res, message, 500);
  }
});

router.post('/goals', async (req: Request, res: Response) => {
  try {
    const { title, description, targetDate, startDate, status } = (req.body ?? {}) as Record<string, unknown>;

    if (!isSafeString(title)) {
      return apiError(res, 'Title is required');
    }
    if (status !== undefined && !GOAL_STATUSES.includes(status as any)) {
      return apiError(res, `Status must be one of ${GOAL_STATUSES.join(', ')}`);
    }

    const goal = await db.goal.create({
      data: {
        userId: req.user!.id,
        title: limitString(title.trim(), 200),
        description: typeof description === 'string' ? limitString(description, 2000) : (description as string | null),
        status: (status as string) || 'IN_PROGRESS',
        startDate: parseDate(startDate) ?? new Date(),
        targetDate: (parseDate(targetDate) ?? null) as Date | null,
      },
    });
    return apiResponse(res, goal, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create goal';
    return apiError(res, message, 500);
  }
});

router.patch('/goals/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await getOwnedGoal(id, req.user!.id);

    const { title, description, status, targetDate, startDate } = (req.body ?? {}) as Record<string, unknown>;

    const data: Record<string, unknown> = {};
    if (title !== undefined) {
      if (!isSafeString(title)) return apiError(res, 'Title must be a non-empty string');
      data.title = limitString(title.trim(), 200);
    }
    if (description !== undefined) data.description = typeof description === 'string' ? limitString(description, 2000) : null;
    if (status !== undefined) {
      if (!GOAL_STATUSES.includes(status as any)) return apiError(res, `Status must be one of ${GOAL_STATUSES.join(', ')}`);
      data.status = status;
    }
    if (targetDate !== undefined) data.targetDate = (parseDate(targetDate) ?? null) as Date | null;
    if (startDate !== undefined) data.startDate = (parseDate(startDate) ?? null) as Date | null;

    const updated = await db.goal.update({ where: { id }, data });
    return apiResponse(res, updated);
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to update goal';
    return apiError(res, message, 500);
  }
});

router.delete('/goals/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await getOwnedGoal(id, req.user!.id);

    await db.$transaction([
      db.task.deleteMany({ where: { goalId: id } }),
      db.milestone.deleteMany({ where: { goalId: id } }),
      db.roadmap.deleteMany({ where: { goalId: id } }),
      db.learning.deleteMany({ where: { goalId: id } }),
      db.event.deleteMany({ where: { goalId: id } }),
      db.note.deleteMany({ where: { goalId: id } }),
      db.reminder.deleteMany({ where: { entityType: 'GOAL', entityId: id } }),
      db.goal.delete({ where: { id } }),
    ]);

    return apiResponse(res, { deleted: true, id });
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to delete goal';
    return apiError(res, message, 500);
  }
});

export default router;