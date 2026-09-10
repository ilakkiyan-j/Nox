import { Router, Request, Response } from 'express';
import { db } from '@nox/database';
import { apiError, apiResponse } from '../lib/http';
import { dateToKey } from '../lib/streaks';

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
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

router.get('/time', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const todayStart = startOfToday();
    const todayEnd = endOfToday();
    const dayKey = dateToKey(now);

    const [tasks, events, reminders, milestones, habits] = await Promise.all([
      db.task.findMany({
        where: { userId, status: { in: ['TODO', 'IN_PROGRESS'] } },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        include: { goal: true },
      }),
      db.event.findMany({
        where: {
          userId,
          // Upcoming today-or-later, including open-ended events (endDate null).
          OR: [{ date: { gte: todayStart } }, { endDate: { gte: todayStart } }],
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
      db.milestone.findMany({
        where: {
          status: { not: 'COMPLETED' },
          targetDate: { not: null },
          OR: [{ goal: { userId } }, { roadmap: { goal: { userId } } }],
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
      const active =
        item.type === 'TASK' && item.sortAt <= now.getTime() + 2 * 60 * 60 * 1000 && item.sortAt >= now.getTime() - 12 * 60 * 60 * 1000
          ? true
          : false;
      if (item.sortAt < now.getTime() && (item.type === 'TASK' || item.type === 'REMINDER')) {
        // Overdue surfaced in "Now" so it cannot be missed.
        nowItems.push({ ...item, label: 'Overdue' });
      } else if (item.type === 'TASK' && item.sortAt === 0) {
        nextItems.push({ ...item, label: 'No due date' });
      } else if (item.sortAt <= todayEnd.getTime()) {
        nextItems.push({ ...item, label: active ? 'Active' : 'Today' });
      } else {
        upcomingItems.push({ ...item });
      }
    }

    for (const t of tasks) {
      const sortAt = t.dueDate ? new Date(t.dueDate).getTime() : t.startDate ? new Date(t.startDate).getTime() : 0;
      push({
        type: 'TASK',
        id: t.id,
        title: t.title,
        subtitle: t.goal?.title,
        when: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : t.startDate ? `Starts ${new Date(t.startDate).toLocaleDateString()}` : undefined,
        time: t.dueDate ? new Date(t.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
        sortAt,
      });
    }

    for (const e of events) {
      const start = new Date(e.date).getTime();
      push({
        type: 'EVENT',
        id: e.id,
        title: e.title,
        subtitle: e.goal?.title,
        when: new Date(e.date).toLocaleDateString(),
        time: e.startTime || (e.endTime ? `ends ${e.endTime}` : undefined),
        sortAt: start,
      });
    }

    for (const r of reminders) {
      const at = new Date(r.remindAt).getTime();
      push({
        type: 'REMINDER',
        id: r.id,
        title: r.title,
        when: new Date(r.remindAt).toLocaleDateString(),
        time: new Date(r.remindAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sortAt: at,
      });
    }

    for (const m of milestones) {
      const at = new Date(m.targetDate as Date).getTime();
      push({
        type: 'MILESTONE',
        id: m.id,
        title: m.title,
        subtitle: m.goal?.title,
        when: new Date(m.targetDate as Date).toLocaleDateString(),
        sortAt: at,
      });
    }

    // Habit schedule — surfaced only where meaningful (a reminder time set).
    for (const h of habits) {
      if (!h.reminderTime) continue;
      const periodic = h.frequency === 'WEEKLY' ? `${dayKey}-W` : `${dayKey}`;
      const [hh, mm] = h.reminderTime.match(/\d{1,2}/)?.map(Number) || [0, 0];
      const sortAt = new Date(now);
      sortAt.setHours(hh, mm, 0, 0);
      nextItems.push({
        type: 'HABIT',
        id: h.id,
        title: h.title,
        subtitle: 'Habit',
        when: `Due ${h.reminderTime}`,
        sortAt: sortAt.getTime(),
        label: periodic,
      });
    }

    for (const arr of [nowItems, nextItems, upcomingItems]) {
      arr.sort((a, b) => a.sortAt - b.sortAt);
    }

    return apiResponse(res, { now: nowItems, next: nextItems, upcoming: upcomingItems });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to build time feed';
    return apiError(res, message, 500);
  }
});

export default router;