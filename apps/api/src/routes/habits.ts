import { Router, Request, Response } from 'express';
import { db } from '@nox/database';
import { apiError, apiResponse, HttpError } from '../lib/http';
import { getOwnedHabit, getOwnedHabitLog } from '../lib/ownership';
import { isSafeString, limitString } from '../lib/validate';
import { computeBestStreak, computeCurrentStreak, dateToKey } from '../lib/streaks';

const router = Router();

const FREQ_PATTERN = /^(DAILY|WEEKLY)$/;

function toLocalDateKey(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  const raw = String(value);
  // YYYY-MM-DD
  const match = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(raw);
  if (match) return raw;
  // ISO date string
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return dateToKey(d);
}

async function recomputeStreaks(habitId: string) {
  const habit = await db.habit.findUnique({
    where: { id: habitId },
    include: { logs: { select: { date: true, status: true } } },
  });
  if (!habit) return;
  const today = dateToKey(new Date());
  const current = computeCurrentStreak(habit.logs as any, today);
  const best = computeBestStreak(habit.logs as any);
  await db.habit.update({
    where: { id: habitId },
    data: { streakCount: current, bestStreak: best },
  });
  return current;
}

router.get('/habits', async (req: Request, res: Response) => {
  try {
    const habits = await db.habit.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ reminderTime: 'asc' }, { createdAt: 'desc' }],
      include: { logs: { orderBy: { createdAt: 'desc' } } },
    });
    return apiResponse(res, habits);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load habits';
    return apiError(res, message, 500);
  }
});

router.post('/habits', async (req: Request, res: Response) => {
  try {
    const { title, frequency, targetCount, reminderTime } = (req.body ?? {}) as Record<string, unknown>;

    if (!isSafeString(title)) return apiError(res, 'Title is required');
    if (frequency !== undefined && typeof frequency === 'string' && !FREQ_PATTERN.test(frequency)) {
      return apiError(res, "Frequency must be DAILY or WEEKLY");
    }
    if (targetCount !== undefined && (typeof targetCount !== 'number' || targetCount < 1 || targetCount > 100)) {
      return apiError(res, 'Target count must be between 1 and 100');
    }

    const habit = await db.habit.create({
      data: {
        userId: req.user!.id,
        title: limitString(title.trim(), 200),
        frequency: (frequency as string) || 'DAILY',
        targetCount: typeof targetCount === 'number' ? targetCount : 1,
        reminderTime: typeof reminderTime === 'string' && reminderTime.trim() ? limitString(reminderTime.trim(), 20) : null,
      },
    });
    return apiResponse(res, habit, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create habit';
    return apiError(res, message, 500);
  }
});

router.patch('/habits/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await getOwnedHabit(id, req.user!.id);

    const { title, frequency, reminderTime, targetCount } = (req.body ?? {}) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (title !== undefined) {
      if (!isSafeString(title)) return apiError(res, 'Title must be a non-empty string');
      data.title = limitString(title.trim(), 200);
    }
    if (frequency !== undefined) {
      if (typeof frequency !== 'string' || !FREQ_PATTERN.test(frequency)) return apiError(res, 'Frequency must be DAILY or WEEKLY');
      data.frequency = frequency;
    }
    if (reminderTime !== undefined) {
      data.reminderTime = typeof reminderTime === 'string' && reminderTime.trim() ? limitString(reminderTime.trim(), 20) : null;
    }
    if (targetCount !== undefined) {
      const count = typeof targetCount === 'number' ? targetCount : parseInt(String(targetCount), 10);
      if (!Number.isFinite(count) || count < 1 || count > 100) return apiError(res, 'Target count must be between 1 and 100');
      data.targetCount = count;
    }

    const updated = await db.habit.update({ where: { id }, data });
    return apiResponse(res, updated);
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to update habit';
    return apiError(res, message, 500);
  }
});

router.delete('/habits/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await getOwnedHabit(id, req.user!.id);

    await db.$transaction([
      db.habitLog.deleteMany({ where: { habitId: id } }),
      db.habit.delete({ where: { id } }),
    ]);
    return apiResponse(res, { deleted: true, id });
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to delete habit';
    return apiError(res, message, 500);
  }
});

router.post('/habits/:id/log', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const habit = await getOwnedHabit(id, req.user!.id);

    const { date, status, notes } = (req.body ?? {}) as Record<string, unknown>;
    const dateKey = toLocalDateKey(date) ?? dateToKey(new Date());
    const logStatus = status === 'SKIPPED' ? 'SKIPPED' : 'COMPLETED';

    const existingLog = await db.habitLog.findFirst({
      where: { habitId: id, date: dateKey },
    });

    if (existingLog) {
      const updatedLog = await db.habitLog.update({
        where: { id: existingLog.id },
        data: { status: logStatus, notes: typeof notes === 'string' && notes.trim() ? limitString(notes, 1000) : null },
      });
      await recomputeStreaks(habit.id);
      return apiResponse(res, updatedLog);
    }

    const habitLog = await db.habitLog.create({
      data: {
        habitId: id,
        date: dateKey,
        status: logStatus,
        notes: typeof notes === 'string' && notes.trim() ? limitString(notes, 1000) : null,
      },
    });

    const newStreak = await recomputeStreaks(habit.id);

    if (logStatus === 'COMPLETED' && typeof newStreak === 'number' && newStreak > 0 && newStreak % 7 === 0) {
      await db.notification.create({
        data: {
          userId: req.user!.id,
          title: 'Habit streak milestone',
          message: `${newStreak}-day streak for "${habit.title}".`,
          type: 'HABIT_STREAK',
          entityType: 'HABIT',
          entityId: habit.id,
        },
      });
    }

    return apiResponse(res, habitLog, 201);
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to log habit';
    return apiError(res, message, 500);
  }
});

router.delete('/habits/logs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const log = await getOwnedHabitLog(id, req.user!.id);
    await db.habitLog.delete({ where: { id } });
    await recomputeStreaks(log.habitId);
    return apiResponse(res, { deleted: true, id });
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to delete log';
    return apiError(res, message, 500);
  }
});

export default router;