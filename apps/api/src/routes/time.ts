import { Router, Request, Response } from 'express';
import { db } from '@nox/database';
import { apiError, apiResponse, HttpError } from '../lib/http';
import {
  dateOnlyFromKey,
  dateOnlyKey,
  formatDateOnly,
  formatInstant,
  getTimeZone,
  zonedDayBounds,
  zonedMidnightUtc,
} from '../lib/timezone';

const router = Router();

interface TimeItem {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  label?: string;
  when?: string;
  sortAt: number;
  time?: string;
  calendarDayKey?: string;
  isDeadline?: boolean;
}

router.get('/time', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const timeZone = getTimeZone(req.query.timeZone);
    const { dayKey, start: todayStart, end: todayEnd } = zonedDayBounds(now, timeZone);
    const todayDate = dateOnlyFromKey(dayKey);

    const [tasks, events, reminders, overdueReminders, milestones, habits] = await Promise.all([
      db.task.findMany({
        where: { userId, status: { in: ['TODO', 'IN_PROGRESS'] } },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        include: { goal: true },
      }),
      db.event.findMany({
        where: {
          userId,
          // Upcoming today-or-later, including open-ended events (endDate null).
          OR: [{ date: { gte: todayDate } }, { endDate: { gte: todayDate } }],
        },
        orderBy: { date: 'asc' },
        include: { goal: true },
        take: 50,
      }),
      db.reminder.findMany({
        where: { userId, isCompleted: false, remindAt: { gte: todayStart } },
        orderBy: { remindAt: 'asc' },
        take: 50,
      }),
      db.reminder.findMany({
        where: { userId, isCompleted: false, remindAt: { lt: todayStart } },
        orderBy: { remindAt: 'desc' },
        take: 10,
      }),
      db.milestone.findMany({
        where: {
          status: { not: 'COMPLETED' },
          targetDate: { not: null },
          OR: [
            { goal: { userId } },
            { roadmap: { userId } },
            { roadmap: { goal: { userId } } },
          ],
        },
        orderBy: { targetDate: 'asc' },
        include: { goal: true },
        take: 50,
      }),
      db.habit.findMany({
        where: { userId },
        orderBy: { reminderTime: 'asc' },
        take: 50,
      }),
    ]);

    const nowItems: TimeItem[] = [];
    const nextItems: TimeItem[] = [];
    const upcomingItems: TimeItem[] = [];

    function push(item: TimeItem) {
      const isOverdue = item.isDeadline && item.calendarDayKey
        ? item.calendarDayKey < dayKey
        : item.isDeadline && item.sortAt > 0 && item.sortAt < now.getTime();
      const isNowWindow = !item.calendarDayKey && item.sortAt > 0 &&
        item.sortAt >= now.getTime() - 1 * 60 * 60 * 1000 &&
        item.sortAt <= now.getTime() + 2 * 60 * 60 * 1000;

      if (isOverdue) {
        nowItems.push({ ...item, label: 'Overdue' });
      } else if (isNowWindow) {
        nowItems.push({ ...item, label: item.label || 'Active Now' });
      } else if (item.type === 'TASK' && item.sortAt === 0) {
        nextItems.push({ ...item, label: 'No due date' });
      } else if (
        (item.calendarDayKey && item.calendarDayKey === dayKey) ||
        (!item.calendarDayKey && item.sortAt <= todayEnd.getTime())
      ) {
        nextItems.push({ ...item, label: item.label || 'Today' });
      } else {
        upcomingItems.push({ ...item });
      }
    }

    for (const t of tasks) {
      const dueDate = t.dueDate as Date | null;
      const startDate = t.startDate as Date | null;
      const calendarDayKey = dueDate
        ? dateOnlyKey(dueDate)
        : startDate
          ? dateOnlyKey(startDate)
          : undefined;
      const sortAt = dueDate
        ? dateOnlyFromKey(calendarDayKey!).getTime()
        : startDate
          ? dateOnlyFromKey(calendarDayKey!).getTime()
          : 0;
      push({
        type: 'TASK',
        id: t.id,
        title: t.title,
        subtitle: t.goal?.title,
        when: dueDate
          ? formatDateOnly(dueDate)
          : startDate
            ? `Starts ${formatDateOnly(startDate)}`
            : undefined,
        sortAt,
        calendarDayKey,
        isDeadline: Boolean(dueDate),
      });
    }

    for (const e of events) {
      const startDate = e.date as Date;
      const endDate = (e.endDate || e.date) as Date;
      const startKey = dateOnlyKey(startDate);
      const endKey = dateOnlyKey(endDate);
      const isOngoing = startKey <= dayKey && endKey >= dayKey;
      const whenStr = e.endDate
        ? `${formatDateOnly(startDate, { month: 'short', day: 'numeric' })} – ${formatDateOnly(endDate, { month: 'short', day: 'numeric' })}`
        : formatDateOnly(startDate);
      const start = dateOnlyFromKey(startKey).getTime();

      push({
        type: 'EVENT',
        id: e.id,
        title: e.title,
        subtitle: e.goal?.title,
        when: whenStr,
        time: e.startTime || (e.endTime ? `ends ${e.endTime}` : undefined),
        sortAt: isOngoing ? Math.max(start, now.getTime()) : start,
        label: isOngoing ? 'Ongoing' : undefined,
        calendarDayKey: isOngoing ? dayKey : startKey,
      });
    }

    for (const r of [...overdueReminders, ...reminders]) {
      const at = new Date(r.remindAt).getTime();
      push({
        type: 'REMINDER',
        id: r.id,
        title: r.title,
        when: formatInstant(r.remindAt, timeZone),
        time: formatInstant(r.remindAt, timeZone, { hour: '2-digit', minute: '2-digit' }),
        sortAt: at,
        calendarDayKey: undefined,
        isDeadline: true,
      });
    }

    for (const m of milestones) {
      const targetDate = m.targetDate as Date;
      const milestoneDayKey = dateOnlyKey(targetDate);
      const at = dateOnlyFromKey(milestoneDayKey).getTime();
      push({
        type: 'MILESTONE',
        id: m.id,
        title: m.title,
        subtitle: m.goal?.title,
        when: formatDateOnly(targetDate),
        sortAt: at,
        calendarDayKey: milestoneDayKey,
        isDeadline: true,
      });
    }

    // Habit schedule — surfaced only where meaningful (a reminder time set).
    for (const h of habits) {
      if (!h.reminderTime) continue;
      const periodic = h.frequency === 'WEEKLY' ? `${dayKey}-W` : `${dayKey}`;
      const [hh, mm] = h.reminderTime.match(/\d{1,2}/)?.map(Number) || [0, 0];
      const sortAt = zonedMidnightUtc(dayKey, timeZone);
      sortAt.setUTCMinutes(sortAt.getUTCMinutes() + hh * 60 + mm);
      nextItems.push({
        type: 'HABIT',
        id: h.id,
        title: h.title,
        subtitle: 'Habit',
        when: `Due ${h.reminderTime}`,
        sortAt: sortAt.getTime(),
        label: periodic,
        calendarDayKey: dayKey,
      });
    }

    for (const arr of [nowItems, nextItems, upcomingItems]) {
      arr.sort((a, b) => a.sortAt - b.sortAt);
    }

    return apiResponse(res, { now: nowItems, next: nextItems, upcoming: upcomingItems });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to build time feed';
    const status = err instanceof HttpError ? err.statusCode : 500;
    return apiError(res, message, status);
  }
});

export default router;