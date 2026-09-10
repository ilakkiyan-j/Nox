import { Router, Request, Response } from 'express';
import { db } from '@nox/database';
import { apiError, apiResponse, HttpError } from '../lib/http';
import { getOwnedNotification } from '../lib/ownership';
import { isSafeString, limitString, NOTIFICATION_TYPES } from '../lib/validate';

const router = Router();

router.get('/notifications', async (req: Request, res: Response) => {
  try {
    const notifications = await db.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return apiResponse(res, notifications);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load notifications';
    return apiError(res, message, 500);
  }
});

router.post('/notifications', async (req: Request, res: Response) => {
  try {
    const { title, message, type, entityType, entityId } = (req.body ?? {}) as Record<string, unknown>;

    if (!isSafeString(title) || !isSafeString(message)) {
      return apiError(res, 'Title and message are required', 400);
    }
    if (type !== undefined && typeof type === 'string' && !NOTIFICATION_TYPES.includes(type as any)) {
      return apiError(res, `Type must be one of ${NOTIFICATION_TYPES.join(', ')}`, 400);
    }

    const notif = await db.notification.create({
      data: {
        userId: req.user!.id,
        title: limitString(title.trim(), 200),
        message: limitString(message.trim(), 500),
        type: (type as string) || 'GENERAL',
        entityType: (entityType as string) || null,
        entityId: (entityId as string) || null,
      },
    });
    return apiResponse(res, notif, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create notification';
    return apiError(res, message, 500);
  }
});

router.patch('/notifications/mark-all-read', async (req: Request, res: Response) => {
  try {
    const { count } = await db.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    return apiResponse(res, { updated: count });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update notifications';
    return apiError(res, message, 500);
  }
});

router.patch('/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await getOwnedNotification(id, req.user!.id);
    const updated = await db.notification.update({ where: { id }, data: { isRead: true } });
    return apiResponse(res, updated);
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to update notification';
    return apiError(res, message, 500);
  }
});

router.delete('/notifications/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await getOwnedNotification(id, req.user!.id);
    await db.notification.delete({ where: { id } });
    return apiResponse(res, { deleted: true, id });
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to delete notification';
    return apiError(res, message, 500);
  }
});

router.delete('/notifications', async (req: Request, res: Response) => {
  try {
    const { count } = await db.notification.deleteMany({ where: { userId: req.user!.id } });
    return apiResponse(res, { cleared: count });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to clear notifications';
    return apiError(res, message, 500);
  }
});

export default router;