import { Router, Request, Response } from 'express';
import { db } from '@nox/database';
import { apiError, apiResponse, HttpError } from '../lib/http';
import { getOwnedLearning, getOwnedLearningModule, validateGoalRelation, validateLearningRelation, validateRoadmapRelation } from '../lib/ownership';
import { isSafeString, LEARNING_STATUSES, LEARNING_TYPES, limitString, parseSafeUrl } from '../lib/validate';

const router = Router();

router.get('/learning', async (req: Request, res: Response) => {
  try {
    const learning = await db.learning.findMany({
      where: { userId: req.user!.id },
      include: { modules: { orderBy: { order: 'asc' } }, goal: true, tasks: true, notes: true },
    });
    return apiResponse(res, learning);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load learning';
    return apiError(res, message, 500);
  }
});

router.post('/learning', async (req: Request, res: Response) => {
  try {
    const { title, type, url, goalId, roadmapId, modules } = (req.body ?? {}) as Record<string, unknown>;

    if (!isSafeString(title)) return apiError(res, 'Title is required');
    if (type !== undefined && !LEARNING_TYPES.includes(type as any)) {
      return apiError(res, `Type must be one of ${LEARNING_TYPES.join(', ')}`);
    }
    await Promise.all([
      validateGoalRelation(goalId as string | undefined, req.user!.id),
      validateRoadmapRelation(roadmapId as string | undefined, req.user!.id),
    ]);

    const urlCheck = parseSafeUrl(url);
    if (!urlCheck.ok) return apiError(res, urlCheck.error, 400);

    const rawModules = Array.isArray(modules) ? modules : [];
    if (rawModules.length > 100) return apiError(res, 'Too many modules (max 100)');

    const learning = await db.learning.create({
      data: {
        userId: req.user!.id,
        title: limitString(title.trim(), 200),
        type: (type as string) || 'COURSE',
        url: urlCheck.value,
        goalId: (goalId as string) || null,
        roadmapId: (roadmapId as string) || null,
        totalModules: rawModules.length,
        modules:
          rawModules.length > 0
            ? {
                create: rawModules
                  .filter((m: any) => typeof m === 'string' || (m && typeof m.title === 'string'))
                  .map((m: any, idx: number) => ({
                    title: limitString(typeof m === 'string' ? m : m.title, 200),
                    order: idx + 1,
                  })),
              }
            : undefined,
      },
      include: { modules: true },
    });
    return apiResponse(res, learning, 201);
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to create learning track';
    return apiError(res, message, 500);
  }
});

router.patch('/learning/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await getOwnedLearning(id, req.user!.id);

    const { title, type, status, url } = (req.body ?? {}) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (title !== undefined) {
      if (!isSafeString(title)) return apiError(res, 'Title must be a non-empty string');
      data.title = limitString(title.trim(), 200);
    }
    if (type !== undefined) {
      if (!LEARNING_TYPES.includes(type as any)) return apiError(res, `Type must be one of ${LEARNING_TYPES.join(', ')}`);
      data.type = type;
    }
    if (status !== undefined) {
      if (!LEARNING_STATUSES.includes(status as any)) return apiError(res, `Status must be one of ${LEARNING_STATUSES.join(', ')}`);
      data.status = status;
    }
    if (url !== undefined) {
      const urlCheck = parseSafeUrl(url);
      if (!urlCheck.ok) return apiError(res, urlCheck.error, 400);
      data.url = urlCheck.value;
    }

    const updated = await db.learning.update({ where: { id }, data });
    return apiResponse(res, updated);
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to update learning track';
    return apiError(res, message, 500);
  }
});

router.delete('/learning/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await getOwnedLearning(id, req.user!.id);

    await db.$transaction([
      db.learningModule.deleteMany({ where: { learningId: id } }),
      db.task.deleteMany({ where: { learningId: id } }),
      db.note.deleteMany({ where: { learningId: id } }),
      db.reminder.deleteMany({ where: { entityType: 'LEARNING', entityId: id } }),
      db.learning.delete({ where: { id } }),
    ]);
    return apiResponse(res, { deleted: true, id });
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to delete learning track';
    return apiError(res, message, 500);
  }
});

// ---- Modules -----------------------------------------------------------------

async function recomputeLearningProgress(learningId: string) {
  const allModules = await db.learningModule.findMany({ where: { learningId } });
  const completedCount = allModules.filter((m) => m.status === 'COMPLETED').length;
  await db.learning.update({
    where: { id: learningId },
    data: {
      totalModules: allModules.length,
      completedModules: completedCount,
      status: allModules.length > 0 && completedCount === allModules.length ? 'COMPLETED' : 'IN_PROGRESS',
    },
  });
}

router.patch('/learning/modules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await getOwnedLearningModule(id, req.user!.id);

    const { status, title } = (req.body ?? {}) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (status !== undefined) {
      if (!['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'].includes(status as string)) {
        return apiError(res, 'Invalid module status');
      }
      data.status = status;
      data.completedAt = status === 'COMPLETED' ? new Date() : null;
    }
    if (title !== undefined) {
      if (!isSafeString(title)) return apiError(res, 'Title must be a non-empty string');
      data.title = limitString(title.trim(), 200);
    }

    const updatedModule = await db.learningModule.update({ where: { id }, data });
    await recomputeLearningProgress(existing.learningId);

    if (status === 'COMPLETED') {
      await db.notification.create({
        data: {
          userId: req.user!.id,
          title: 'Module completed',
          message: `Completed "${updatedModule.title}" in your learning path.`,
          type: 'GOAL_PROGRESS',
          entityType: 'LEARNING_MODULE',
          entityId: updatedModule.id,
        },
      });
    }

    return apiResponse(res, updatedModule);
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to update module';
    return apiError(res, message, 500);
  }
});

router.post('/learning/:id/modules', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await getOwnedLearning(id, req.user!.id);

    const { title } = (req.body ?? {}) as Record<string, unknown>;
    if (!isSafeString(title)) return apiError(res, 'Module title is required');

    const existingCount = await db.learningModule.count({ where: { learningId: id } });
    if (existingCount >= 100) return apiError(res, 'Too many modules (max 100)', 400);

    const moduleItem = await db.learningModule.create({
      data: {
        learningId: id,
        title: limitString(title.trim(), 200),
        order: existingCount + 1,
      },
    });
    await db.learning.update({ where: { id }, data: { totalModules: existingCount + 1 } });

    return apiResponse(res, moduleItem, 201);
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to add module';
    return apiError(res, message, 500);
  }
});

router.delete('/learning/modules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const moduleItem = await getOwnedLearningModule(id, req.user!.id);
    const learningId = moduleItem.learningId;

    await db.learningModule.delete({ where: { id } });
    await recomputeLearningProgress(learningId);

    return apiResponse(res, { deleted: true, id });
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to delete module';
    return apiError(res, message, 500);
  }
});

export default router;