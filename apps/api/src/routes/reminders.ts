import { Router, Request, Response } from 'express';
import { db } from '@nox/database';
import { apiError, apiResponse, HttpError } from '../lib/http';
import { getOwnedReminder, validateEventRelation, validateGoalRelation, validateHabitRelation, validateLearningRelation, validateMilestoneRelation, validateTaskRelation } from '../lib/ownership';
import { isSafeString, limitString } from '../lib/validate';

const router = Router();

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? null : d;
}

const ENTITY_TYPES = ['TASK', 'EVENT', 'HABIT', 'GOAL', 'MILESTONE', 'LEARNING', 'GENERAL'];

router.get('/reminders', async (req: Request, res: Response) => {
  try {
    const reminders = await db.reminder.findMany({
      where: { userId: req.user!.id },
      orderBy: { remindAt: 'asc' },
    });
    return apiResponse(res, reminders);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load reminders';
    return apiError(res, message, 500);
  }
});

router.post('/reminders', async (req: Request, res: Response) => {
  try {
    const { title, remindAt, entityType, entityId } = (req.body ?? {}) as Record<string, unknown>;

    if (!isSafeString(title)) return apiError(res, 'Title is required');
    if (entityType !== undefined && entityType !== null) {
      if (typeof entityType !== 'string' || !ENTITY_TYPES.includes(entityType)) {
        return apiError(res, `entityType must be one of ${ENTITY_TYPES.join(', ')}`);
      }
      await validateGoalRelation(entityType === 'GOAL' ? (entityId as string) : undefined, req.user!.id);
      await validateTaskRelation(entityType === 'TASK' ? (entityId as string) : undefined, req.user!.id);
      await validateEventRelation(entityType === 'EVENT' ? (entityId as string) : undefined, req.user!.id);
      await validateHabitRelation(entityType === 'HABIT' ? (entityId as string) : undefined, req.user!.id);
      await validateMilestoneRelation(entityType === 'MILESTONE' ? (entityId as string) : undefined, req.user!.id);
      await validateLearningRelation(entityType === 'LEARNING' ? (entityId as string) : undefined, req.user!.id);
    }

    const reminder = await db.reminder.create({
      data: {
        userId: req.user!.id,
        title: limitString(title.trim(), 200),
        remindAt: (parseDate(remindAt) ?? new Date()) as Date,
        entityType: (entityType as string) || null,
        entityId: (entityId as string) || null,
      },
    });
    return apiResponse(res, reminder, 201);
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to create reminder';
    return apiError(res, message, 500);
  }
});

router.patch('/reminders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await getOwnedReminder(id, req.user!.id);

    const { title, remindAt, isCompleted } = (req.body ?? {}) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (title !== undefined) {
      if (!isSafeString(title)) return apiError(res, 'Title must be a non-empty string');
      data.title = limitString(title.trim(), 200);
    }
    if (remindAt !== undefined) data.remindAt = (parseDate(remindAt) ?? undefined) as Date | undefined;
    if (isCompleted !== undefined) data.isCompleted = Boolean(isCompleted);

    const updated = await db.reminder.update({ where: { id }, data });
    return apiResponse(res, updated);
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to update reminder';
    return apiError(res, message, 500);
  }
});

router.delete('/reminders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await getOwnedReminder(id, req.user!.id);
    await db.reminder.delete({ where: { id } });
    return apiResponse(res, { deleted: true, id });
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to delete reminder';
    return apiError(res, message, 500);
  }
});

export default router;