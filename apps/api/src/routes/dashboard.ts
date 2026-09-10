import { Router, Request, Response } from 'express';
import { db } from '@nox/database';
import { apiError, apiResponse } from '../lib/http';

const router = Router();

router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const [tasks, upcomingEvents, activeGoals, activeLearning, habits, reminders, unreadNotifications, recentNotes] = await Promise.all([
      db.task.findMany({
        where: { userId, status: { in: ['TODO', 'IN_PROGRESS'] } },
        orderBy: { dueDate: 'asc' },
        take: 5,
        include: { goal: true, milestone: true },
      }),
      db.event.findMany({
        where: { userId },
        orderBy: { date: 'asc' },
        take: 3,
        include: { goal: true },
      }),
      db.goal.findMany({
        where: { userId, status: 'IN_PROGRESS' },
        take: 4,
        include: { roadmaps: true, milestones: true },
      }),
      db.learning.findMany({
        where: { userId, status: 'IN_PROGRESS' },
        take: 3,
        include: { modules: true },
      }),
      db.habit.findMany({
        where: { userId },
        include: { logs: true },
      }),
      db.reminder.findMany({
        where: { userId, isCompleted: false },
        orderBy: { remindAt: 'asc' },
        take: 4,
      }),
      db.notification.findMany({
        where: { userId, isRead: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      db.note.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 4,
        include: { folder: true },
      }),
    ]);

    return apiResponse(res, {
      tasks,
      upcomingEvents,
      activeGoals,
      activeLearning,
      habits,
      reminders,
      unreadNotifications,
      recentNotes,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load dashboard';
    return apiError(res, message, 500);
  }
});

export default router;