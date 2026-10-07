import { Router, Request, Response } from 'express';
import { db } from '@nox/database';
import { apiError, apiResponse, HttpError } from '../lib/http';
import { parseDateInput } from '../lib/date-validation';
import { getOwnedEvent, validateGoalRelation, validateLearningRelation, validateRoadmapRelation } from '../lib/ownership';
import { isSafeString, limitString, parseSafeUrl } from '../lib/validate';

const router = Router();

function normalizeTime(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return null;
  const t = value.trim();
  if (!t) return null;
  return limitString(t, 50);
}

function validateEventDateRange(startDate: Date, endDate: Date | null): void {
  if (endDate && endDate.toISOString().slice(0, 10) < startDate.toISOString().slice(0, 10)) {
    throw new HttpError('Event end date cannot be before its start date', 400);
  }
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

    const eventDate = (parseDateInput(date, 'Event date') ?? new Date()) as Date;
    const eventEndDate = (parseDateInput(endDate, 'Event end date') ?? null) as Date | null;
    validateEventDateRange(eventDate, eventEndDate);

    const event = await db.event.create({
      data: {
        userId: req.user!.id,
        title: limitString(title.trim(), 200),
        description: typeof description === 'string' ? limitString(description, 2000) : (description as string | null),
        date: eventDate,
        endDate: eventEndDate,
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
    const existing = await getOwnedEvent(id, req.user!.id);

    const { title, description, date, endDate, startTime, endTime, location, url, isOnline } = (req.body ?? {}) as Record<string, unknown>;

    const data: Record<string, unknown> = {};
    if (title !== undefined) {
      if (!isSafeString(title)) return apiError(res, 'Title must be a non-empty string');
      data.title = limitString(title.trim(), 200);
    }
    if (description !== undefined) data.description = typeof description === 'string' ? limitString(description, 2000) : null;
    const parsedDate = date !== undefined ? parseDateInput(date, 'Event date') : existing.date;
    if (!parsedDate) return apiError(res, 'Event date is invalid');
    const parsedEndDate = endDate !== undefined
      ? (parseDateInput(endDate, 'Event end date') ?? null) as Date | null
      : existing.endDate as Date | null;
    validateEventDateRange(parsedDate, parsedEndDate);
    if (date !== undefined) data.date = parsedDate;
    if (endDate !== undefined) data.endDate = parsedEndDate;
    if (startTime !== undefined) data.startTime = normalizeTime(startTime);
    if (endTime !== undefined) data.endTime = normalizeTime(endTime);
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