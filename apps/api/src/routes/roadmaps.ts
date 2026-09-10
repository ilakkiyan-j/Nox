import { Router, Request, Response } from 'express';
import { db } from '@nox/database';
import { apiError, apiResponse, HttpError } from '../lib/http';
import { getOwnedGoal, getOwnedMilestone, getOwnedRoadmap, validateGoalRelation, validateMilestoneRelation, validateRoadmapRelation } from '../lib/ownership';
import { MILESTONE_STATUSES, TASK_PRIORITIES, isSafeString, limitString, validateRoadmapPlan } from '../lib/validate';

const router = Router();

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? null : d;
}

// ---- Roadmaps ---------------------------------------------------------------

router.get('/roadmaps', async (req: Request, res: Response) => {
  try {
    const roadmaps = await db.roadmap.findMany({
      where: { userId: req.user!.id },
      include: { goal: { select: { id: true, title: true, status: true } }, milestones: { orderBy: { order: 'asc' } }, tasks: true },
      orderBy: { createdAt: 'desc' },
    });
    return apiResponse(res, roadmaps);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load roadmaps';
    return apiError(res, message, 500);
  }
});

router.post('/roadmaps', async (req: Request, res: Response) => {
  try {
    const { goalId, title, description } = (req.body ?? {}) as Record<string, unknown>;

    if (!isSafeString(title)) return apiError(res, 'Title is required');
    await validateGoalRelation(goalId as string | undefined, req.user!.id);

    const roadmap = await db.roadmap.create({
      data: {
        userId: req.user!.id,
        goalId: (goalId as string) || null,
        title: limitString(title.trim(), 200),
        description: typeof description === 'string' ? limitString(description, 2000) : (description as string | null),
      },
      include: { goal: { select: { id: true, title: true } }, milestones: true },
    });
    return apiResponse(res, roadmap, 201);
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to create roadmap';
    return apiError(res, message, 500);
  }
});

router.post('/roadmaps/import', async (req: Request, res: Response) => {
  try {
    const payload = (req.body ?? {}) as Record<string, unknown>;

    // Strict validation — never trust the imported payload.
    const validation = validateRoadmapPlan(payload);
    if (!validation.isValid) {
      return apiError(res, `Import rejected: ${validation.error}`, 400);
    }

    const { goalId, title, description, milestones } = payload;
    await validateGoalRelation(goalId as string | undefined, req.user!.id);

    const createdRoadmap = await db.$transaction(async (tx) => {
      const roadmap = await tx.roadmap.create({
        data: {
          userId: req.user!.id,
          goalId: (goalId as string) || null,
          title: limitString(String(title).trim(), 200),
          description: typeof description === 'string' && description.trim() ? limitString(description, 2000) : 'Imported via Roadmap JSON Plan',
        },
      });

      for (let mIdx = 0; mIdx < (milestones as any[]).length; mIdx++) {
        const m = milestones[mIdx];
        const milestone = await tx.milestone.create({
          data: {
            goalId: (goalId as string) || null,
            roadmapId: roadmap.id,
            title: limitString(String(m.title).trim(), 200),
            description: typeof m.description === 'string' && m.description.trim() ? limitString(m.description, 2000) : null,
            order: mIdx + 1,
            targetDate: m.targetDate ? new Date(String(m.targetDate)) : null,
          },
        });

        if (Array.isArray(m.tasks) && m.tasks.length > 0) {
          for (const t of m.tasks) {
            await tx.task.create({
              data: {
                userId: req.user!.id,
                goalId: (goalId as string) || null,
                roadmapId: roadmap.id,
                milestoneId: milestone.id,
                title: limitString(String(t.title).trim(), 200),
                description: typeof t.description === 'string' && t.description.trim() ? limitString(t.description, 2000) : null,
                priority: TASK_PRIORITIES.includes((t.priority as any)) ? t.priority : 'MEDIUM',
                estimatedMinutes: typeof t.estimatedMinutes === 'number' ? t.estimatedMinutes : null,
                dueDate: t.dueDate ? new Date(String(t.dueDate)) : null,
              },
            });
          }
        }
      }

      return tx.roadmap.findUnique({
        where: { id: roadmap.id },
        include: { milestones: { include: { tasks: true } } },
      });
    });

    if (createdRoadmap) {
      await db.notification.create({
        data: {
          userId: req.user!.id,
          title: 'Roadmap plan imported',
          message: `Imported "${createdRoadmap.title}" with ${createdRoadmap.milestones.length} milestones.`,
          type: 'ROADMAP_UPDATED',
          entityType: 'ROADMAP',
          entityId: createdRoadmap.id,
        },
      });
    }

    return apiResponse(res, createdRoadmap, 201, 'Roadmap imported successfully');
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Roadmap import failed';
    return apiError(res, `Roadmap import failed: ${message}`, 400);
  }
});

router.patch('/roadmaps/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await getOwnedRoadmap(id, req.user!.id);

    const { title, description, status } = (req.body ?? {}) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (title !== undefined) {
      if (!isSafeString(title)) return apiError(res, 'Title must be a non-empty string');
      data.title = limitString(title.trim(), 200);
    }
    if (description !== undefined) data.description = typeof description === 'string' ? limitString(description, 2000) : null;
    if (status !== undefined) {
      if (!['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'].includes(status as string)) {
        return apiError(res, 'Invalid roadmap status');
      }
      data.status = status;
    }

    const updated = await db.roadmap.update({ where: { id }, data });
    return apiResponse(res, updated);
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to update roadmap';
    return apiError(res, message, 500);
  }
});

router.delete('/roadmaps/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await getOwnedRoadmap(id, req.user!.id);

    await db.$transaction([
      db.task.deleteMany({ where: { roadmapId: id } }),
      db.milestone.deleteMany({ where: { roadmapId: id } }),
      db.reminder.deleteMany({ where: { entityType: 'ROADMAP', entityId: id } }),
      db.roadmap.delete({ where: { id } }),
    ]);
    return apiResponse(res, { deleted: true, id });
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to delete roadmap';
    return apiError(res, message, 500);
  }
});

// ---- Milestones --------------------------------------------------------------

router.get('/milestones', async (req: Request, res: Response) => {
  try {
    const milestones = await db.milestone.findMany({
      where: { OR: [{ goal: { userId: req.user!.id } }, { roadmap: { userId: req.user!.id } }] },
      include: { goal: true, roadmap: true, tasks: true },
      orderBy: { order: 'asc' },
    });
    return apiResponse(res, milestones);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load milestones';
    return apiError(res, message, 500);
  }
});

router.post('/milestones', async (req: Request, res: Response) => {
  try {
    const { goalId, roadmapId, title, description, targetDate } = (req.body ?? {}) as Record<string, unknown>;

    if (!isSafeString(title)) return apiError(res, 'Title is required');
    await validateGoalRelation(goalId as string | undefined, req.user!.id);
    await validateRoadmapRelation(roadmapId as string | undefined, req.user!.id);

    const milestone = await db.milestone.create({
      data: {
        goalId: (goalId as string) || null,
        roadmapId: (roadmapId as string) || null,
        title: limitString(title.trim(), 200),
        description: typeof description === 'string' ? limitString(description, 2000) : (description as string | null),
        targetDate: (parseDate(targetDate) ?? null) as Date | null,
      },
    });
    return apiResponse(res, milestone, 201);
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to create milestone';
    return apiError(res, message, 500);
  }
});

router.patch('/milestones/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await getOwnedMilestone(id, req.user!.id);

    const { status, title, description } = (req.body ?? {}) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (status !== undefined) {
      if (!MILESTONE_STATUSES.includes(status as any)) {
        return apiError(res, `Status must be one of ${MILESTONE_STATUSES.join(', ')}`);
      }
      data.status = status;
      if (status === 'COMPLETED' && !data.completedAt) data.completedAt = new Date();
      if (status !== 'COMPLETED') data.completedAt = null;
    }
    if (title !== undefined) {
      if (!isSafeString(title)) return apiError(res, 'Title must be a non-empty string');
      data.title = limitString(title.trim(), 200);
    }
    if (description !== undefined) data.description = typeof description === 'string' ? limitString(description, 2000) : null;

    const milestone = await db.milestone.update({ where: { id }, data });

    if (status === 'COMPLETED') {
      await db.notification.create({
        data: {
          userId: req.user!.id,
          title: 'Milestone achieved',
          message: `Milestone "${milestone.title}" was completed!`,
          type: 'MILESTONE_ACHIEVED',
          entityType: 'MILESTONE',
          entityId: milestone.id,
        },
      });

      if (milestone.goalId) {
        const goal = await db.goal.findUnique({ where: { id: milestone.goalId } });
        if (goal) {
          const completedCount = await db.milestone.count({ where: { goalId: goal.id, status: 'COMPLETED' } });
          const totalCount = await db.milestone.count({ where: { goalId: goal.id } });
          if (completedCount === totalCount && totalCount > 0 && goal.status !== 'COMPLETED') {
            await db.goal.update({ where: { id: goal.id }, data: { status: 'COMPLETED' } });
            await db.notification.create({
              data: {
                userId: req.user!.id,
                title: 'Goal achieved',
                message: `Goal "${goal.title}" is now complete.`,
                type: 'GOAL_PROGRESS',
                entityType: 'GOAL',
                entityId: goal.id,
              },
            });
          }
        }
      }
    }

    return apiResponse(res, milestone);
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to update milestone';
    return apiError(res, message, 500);
  }
});

router.delete('/milestones/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await getOwnedMilestone(id, req.user!.id);

    await db.$transaction([
      db.task.deleteMany({ where: { milestoneId: id } }),
      db.reminder.deleteMany({ where: { entityType: 'MILESTONE', entityId: id } }),
      db.milestone.delete({ where: { id } }),
    ]);
    return apiResponse(res, { deleted: true, id });
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to delete milestone';
    return apiError(res, message, 500);
  }
});

export default router;