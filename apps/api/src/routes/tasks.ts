import { Router, Request, Response } from 'express';
import { db } from '@nox/database';
import { apiError, apiResponse, HttpError } from '../lib/http';
import {
  getOwnedTask,
  validateEventRelation,
  validateGoalRelation,
  validateLearningRelation,
  validateMilestoneRelation,
  validateRoadmapRelation,
} from '../lib/ownership';
import { isSafeString, limitString, TASK_PRIORITIES, TASK_STATUSES } from '../lib/validate';

const router = Router();

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? null : d;
}

router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const tasks = await db.task.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      include: { goal: true, roadmap: true, milestone: true, learning: true, event: true },
    });
    return apiResponse(res, tasks);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load tasks';
    return apiError(res, message, 500);
  }
});

router.post('/tasks', async (req: Request, res: Response) => {
  try {
    const { title, description, priority, dueDate, startDate, estimatedMinutes, goalId, roadmapId, milestoneId, learningId, eventId } = (req.body ?? {}) as Record<string, unknown>;

    if (!isSafeString(title)) return apiError(res, 'Task title required');

    await Promise.all([
      validateGoalRelation(goalId as string | undefined, req.user!.id),
      validateRoadmapRelation(roadmapId as string | undefined, req.user!.id),
      validateMilestoneRelation(milestoneId as string | undefined, req.user!.id),
      validateLearningRelation(learningId as string | undefined, req.user!.id),
      validateEventRelation(eventId as string | undefined, req.user!.id),
    ]);

    const task = await db.task.create({
      data: {
        userId: req.user!.id,
        title: limitString(title.trim(), 200),
        description: typeof description === 'string' ? limitString(description, 2000) : (description as string | null),
        priority: TASK_PRIORITIES.includes((priority as any)) ? (priority as string) : 'MEDIUM',
        dueDate: (parseDate(dueDate) ?? null) as Date | null,
        startDate: (parseDate(startDate) ?? null) as Date | null,
        estimatedMinutes:
          estimatedMinutes === undefined || estimatedMinutes === null || estimatedMinutes === ''
            ? null
            : Math.max(1, Math.min(10000, parseInt(String(estimatedMinutes), 10) || 1)),
        goalId: (goalId as string) || null,
        roadmapId: (roadmapId as string) || null,
        milestoneId: (milestoneId as string) || null,
        learningId: (learningId as string) || null,
        eventId: (eventId as string) || null,
      },
    });
    return apiResponse(res, task, 201);
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to create task';
    return apiError(res, message, 500);
  }
});

router.patch('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await getOwnedTask(id, req.user!.id);

    const { title, description, status, priority, dueDate, startDate, estimatedMinutes, goalId } = (req.body ?? {}) as Record<string, unknown>;

    const data: Record<string, unknown> = {};
    if (title !== undefined) {
      if (!isSafeString(title)) return apiError(res, 'Title must be a non-empty string');
      data.title = limitString(title.trim(), 200);
    }
    if (description !== undefined) data.description = typeof description === 'string' ? limitString(description, 2000) : null;
    if (status !== undefined) {
      if (!TASK_STATUSES.includes(status as any)) return apiError(res, `Status must be one of ${TASK_STATUSES.join(', ')}`);
      data.status = status;
    }
    if (priority !== undefined) {
      if (!TASK_PRIORITIES.includes(priority as any)) return apiError(res, `Priority must be one of ${TASK_PRIORITIES.join(', ')}`);
      data.priority = priority;
    }
    if (dueDate !== undefined) data.dueDate = (parseDate(dueDate) ?? null) as Date | null;
    if (startDate !== undefined) data.startDate = (parseDate(startDate) ?? null) as Date | null;
    if (estimatedMinutes !== undefined) {
      data.estimatedMinutes =
        estimatedMinutes === null || estimatedMinutes === ''
          ? null
          : Math.max(1, Math.min(10000, parseInt(String(estimatedMinutes), 10) || 1));
    }
    if (goalId !== undefined) {
      await validateGoalRelation(goalId as string | undefined, req.user!.id);
      data.goalId = (goalId as string) || null;
    }

    const updated = await db.task.update({ where: { id }, data });

    if (status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      await db.notification.create({
        data: {
          userId: req.user!.id,
          title: 'Task completed',
          message: `Task "${updated.title}" marked complete.`,
          type: 'TASK_DUE',
          entityType: 'TASK',
          entityId: updated.id,
        },
      });
    }

    return apiResponse(res, updated);
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to update task';
    return apiError(res, message, 500);
  }
});

router.delete('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await getOwnedTask(id, req.user!.id);

    await db.$transaction([
      db.note.deleteMany({ where: { taskId: id } }),
      db.reminder.deleteMany({ where: { entityType: 'TASK', entityId: id } }),
      db.notification.deleteMany({ where: { entityType: 'TASK', entityId: id } }),
      db.task.delete({ where: { id } }),
    ]);
    return apiResponse(res, { deleted: true, id });
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to delete task';
    return apiError(res, message, 500);
  }
});

export default router;