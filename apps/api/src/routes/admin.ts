import { Router, Request, Response } from 'express';
import { db } from '@nox/database';
import { apiError, apiResponse } from '../lib/http';
import { hashPassword, sanitizeUser } from '../lib/auth';
import { limitString } from '../lib/validate';

const router = Router();

function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && email.trim().length > 3 && email.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  headline: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
} as const;

router.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: USER_SELECT,
    });
    return apiResponse(res, users);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list users';
    return apiError(res, message, 500);
  }
});

router.post('/users', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, headline } = (req.body ?? {}) as Record<string, unknown>;

    if (typeof name !== 'string' || name.trim().length === 0) {
      return apiError(res, 'Name is required');
    }
    if (!isValidEmail(email)) {
      return apiError(res, 'A valid email is required');
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 200) {
      return apiError(res, 'Password must be at least 8 characters');
    }

    const existing = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      return apiError(res, 'An account with this email already exists', 409);
    }

    const newUser = await db.user.create({
      data: {
        name: limitString(name.trim(), 100),
        email: email.trim().toLowerCase(),
        password: await hashPassword(password),
        role: role === 'ADMIN' || role === 'USER' ? role : 'USER',
        headline: typeof headline === 'string' && headline.trim() ? limitString(headline.trim(), 300) : 'Second Self System User',
      },
      select: USER_SELECT,
    });

    await db.folder.create({
      data: {
        userId: newUser.id,
        name: 'Unsorted',
        icon: 'inbox',
        color: '#64748B',
        isSystem: true,
      },
    });

    return apiResponse(res, newUser, 201, 'User account created successfully');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create user';
    return apiError(res, message, 500);
  }
});

router.patch('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, headline } = (req.body ?? {}) as Record<string, unknown>;

    const existing = await db.user.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return apiError(res, 'User not found', 404);
    if (id === req.user!.id && role === 'USER') {
      return apiError(res, 'You cannot remove your own administrator role', 400);
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) return apiError(res, 'Name must be a non-empty string');
      data.name = limitString(name.trim(), 100);
    }
    if (email !== undefined) {
      if (!isValidEmail(email)) return apiError(res, 'A valid email is required');
      const clash = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
      if (clash && clash.id !== id) return apiError(res, 'An account with this email already exists', 409);
      data.email = email.trim().toLowerCase();
    }
    if (password !== undefined && password !== null && password !== '') {
      if (typeof password !== 'string' || password.length < 8 || password.length > 200) {
        return apiError(res, 'Password must be at least 8 characters');
      }
      data.password = await hashPassword(password);
    }
    if (role !== undefined) {
      if (role !== 'ADMIN' && role !== 'USER') return apiError(res, 'Role must be ADMIN or USER');
      data.role = role;
    }
    if (headline !== undefined) {
      if (typeof headline !== 'string') return apiError(res, 'Headline must be a string');
      data.headline = limitString(headline, 300);
    }

    const updated = await db.user.update({ where: { id }, data, select: USER_SELECT });
    return apiResponse(res, { user: updated, passwordReset: typeof password === 'string' && password.length > 0 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update user';
    return apiError(res, message, 500);
  }
});

router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await db.user.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return apiError(res, 'User not found', 404);
    if (id === req.user!.id) {
      return apiError(res, 'You cannot delete your own account', 400);
    }

    await db.$transaction([
      db.habitLog.deleteMany({ where: { habit: { userId: id } } }),
      db.learningModule.deleteMany({ where: { learning: { userId: id } } }),
      db.task.deleteMany({ where: { userId: id } }),
      db.milestone.deleteMany({ where: { goal: { userId: id } } }),
      db.roadmap.deleteMany({ where: { goal: { userId: id } } }),
      db.goal.deleteMany({ where: { userId: id } }),
      db.event.deleteMany({ where: { userId: id } }),
      db.learning.deleteMany({ where: { userId: id } }),
      db.habit.deleteMany({ where: { userId: id } }),
      db.note.deleteMany({ where: { userId: id } }),
      db.folder.deleteMany({ where: { userId: id } }),
      db.reminder.deleteMany({ where: { userId: id } }),
      db.notification.deleteMany({ where: { userId: id } }),
      db.user.delete({ where: { id } }),
    ]);

    return apiResponse(res, { deleted: true, id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete user';
    return apiError(res, message, 500);
  }
});

export default router;
