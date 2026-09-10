import { Router, Request, Response } from 'express';
import { db } from '@nox/database';
import { apiError, apiResponse, HttpError } from '../lib/http';
import { getOwnedEvent, validateGoalRelation, validateLearningRelation, validateRoadmapRelation } from '../lib/ownership';
import { isSafeString, limitString, parseSafeUrl } from '../lib/validate';

const router = Router();

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? null : d;
}

const TIME_PATTERN = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;
const TIME_PATTERN_24 = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

function normalizeTime(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.trim().length > 20) return null;
  const t = value.trim();
  if (TIME_PATTERN.test(t) || TIME_PATTERN_24.test(t)) return t;
  return null;
}

router.get('/events', async (req: Request, res: Response) => {
  try {
    const events = await db.event.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ date: 'asc' }, { createdAt: 'desc' }],
      include: { goal: true, roadmap: true, learning: true, tasks: true, notes: true },
    });
    return apiResponse(res, events);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load events';
    return apiError(res, message, 500);
  }
});

router.post('/events', async (req: Request, res: Response) => {
  try {
    const { title, description, date, endDate, startTime, endTime, location, url, isOnline, goalId, roadmapId, learningId } = (req.body ?? {}) as Record<string, unknown>;

    if (!isSafeString(title)) {
      return apiError(res, 'Title is required');
    }
    await Promise.all([
      validateGoalRelation(goalId as string | undefined, req.user!.id),
      validateRoadmapRelation(roadmapId as string | undefined, req.user!.id),
      validateLearningRelation(learningId as string | undefined, req.user!.id),
    ]);

    const urlCheck = parseSafeUrl(url);
    if (!urlCheck.ok) return apiError(res, urlCheck.error, 400);

    const event = await db.event.create({
      data: {
        userId: req.user!.id,
        title: limitString(title.trim(), 200),
        description: typeof description === 'string' ? limitString(description, 2000) : (description as string | null),
        date: (parseDate(date) ?? new Date()) as Date,
        endDate: (parseDate(endDate) ?? null) as Date | null,
        startTime: normalizeTime(startTime),
        endTime: normalizeTime(endTime),
        location: typeof location === 'string' && location.trim() ? limitString(location.trim(), 300) : null,
        url: urlCheck.value,
        isOnline: isOnline === undefined ? true : Boolean(isOnline),
        goalId: (goalId as string) || null,
        roadmapId: (roadmapId as string) || null,
        learningId: (learningId as string) || null,
      },
    });
    return apiResponse(res, event, 201);
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to create event';
    return apiError(res, message, 500);
  }
});

router.patch('/events/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await getOwnedEvent(id, req.user!.id);

    const { title, description, date, endDate, startTime, endTime, location, url, isOnline } = (req.body ?? {}) as Record<string, unknown>;

    const data: Record<string, unknown> = {};
    if (title !== undefined) {
      if (!isSafeString(title)) return apiError(res, 'Title must be a non-empty string');
      data.title = limitString(title.trim(), 200);
    }
    if (description !== undefined) data.description = typeof description === 'string' ? limitString(description, 2000) : null;
    if (date !== undefined) {
      const parsed = parseDate(date);
      if (!parsed) return apiError(res, 'Event date is invalid');
      data.date = parsed;
    }
    if (endDate !== undefined) data.endDate = (parseDate(endDate) ?? null) as Date | null;
    if (startTime !== undefined) {
      const t = normalizeTime(startTime);
      if (startTime !== '' && !t) return apiError(res, 'Start time must be a valid time (e.g. 09:00 AM)');
      data.startTime = t;
    }
    if (endTime !== undefined) {
      const t = normalizeTime(endTime);
      if (endTime !== '' && !t) return apiError(res, 'End time must be a valid time (e.g. 06:00 PM)');
      data.endTime = t;
    }
    if (location !== undefined) data.location = typeof location === 'string' && location.trim() ? limitString(location.trim(), 300) : null;
    if (url !== undefined) {
      const urlCheck = parseSafeUrl(url);
      if (!urlCheck.ok) return apiError(res, urlCheck.error, 400);
      data.url = urlCheck.value;
    }
    if (isOnline !== undefined) data.isOnline = Boolean(isOnline);

    const updated = await db.event.update({ where: { id }, data });
    return apiResponse(res, updated);
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to update event';
    return apiError(res, message, 500);
  }
});

router.delete('/events/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await getOwnedEvent(id, req.user!.id);

    await db.$transaction([
      db.task.deleteMany({ where: { eventId: id } }),
      db.note.deleteMany({ where: { eventId: id } }),
      db.reminder.deleteMany({ where: { entityType: 'EVENT', entityId: id } }),
      db.notification.deleteMany({ where: { entityType: 'EVENT', entityId: id } }),
      db.event.delete({ where: { id } }),
    ]);
    return apiResponse(res, { deleted: true, id });
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to delete event';
    return apiError(res, message, 500);
  }
});

export default router;