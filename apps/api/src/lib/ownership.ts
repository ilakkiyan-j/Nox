import { db } from '@nox/database';
import { HttpError } from './http';

/**
 * Ownership enforcement. Every user-owned resource is resolved through the
 * authenticated user's id. Resources that do not exist OR do not belong to
 * the caller both yield 404 so callers cannot enumerate other users' data.
 */

export type OwnerResolver<T = any> = (userId: string) => Promise<T | null>;

async function owned<T>(userId: string, loader: OwnerResolver<T>, ownerIdFor: (record: T) => string | null): Promise<T> {
  const record = await loader(userId);
  if (!record) throw new HttpError('Resource not found', 404);
  if (ownerIdFor(record) !== userId) throw new HttpError('Resource not found', 404);
  return record;
}

// ---- Directly owned models (own userId column) ------------------------------

export const getOwnedGoal = (id: string, userId: string) =>
  owned(userId, () => db.goal.findUnique({ where: { id } }), (g: any) => g.userId);
export const getOwnedTask = (id: string, userId: string) =>
  owned(userId, () => db.task.findUnique({ where: { id } }), (t: any) => t.userId);
export const getOwnedLearning = (id: string, userId: string) =>
  owned(userId, () => db.learning.findUnique({ where: { id } }), (l: any) => l.userId);
export const getOwnedEvent = (id: string, userId: string) =>
  owned(userId, () => db.event.findUnique({ where: { id } }), (e: any) => e.userId);
export const getOwnedHabit = (id: string, userId: string) =>
  owned(userId, () => db.habit.findUnique({ where: { id } }), (h: any) => h.userId);
export const getOwnedNote = (id: string, userId: string) =>
  owned(userId, () => db.note.findUnique({ where: { id } }), (n: any) => n.userId);
export const getOwnedFolder = (id: string, userId: string) =>
  owned(userId, () => db.folder.findUnique({ where: { id } }), (f: any) => f.userId);
export const getOwnedReminder = (id: string, userId: string) =>
  owned(userId, () => db.reminder.findUnique({ where: { id } }), (r: any) => r.userId);
export const getOwnedNotification = (id: string, userId: string) =>
  owned(userId, () => db.notification.findUnique({ where: { id } }), (n: any) => n.userId);

// ---- Indirectly owned models -----------------------------------------------

export async function getOwnedRoadmap(id: string, userId: string) {
  return owned(
    userId,
    () => db.roadmap.findUnique({ where: { id } }),
    (r: any) => r.userId,
  );
}

export async function getOwnedMilestone(id: string, userId: string) {
  return owned(
    userId,
    () => db.milestone.findUnique({ where: { id }, include: { goal: true, roadmap: true } }),
    (m: any) => m.goal?.userId ?? m.roadmap?.userId ?? null,
  );
}

export async function getOwnedLearningModule(id: string, userId: string) {
  return owned(
    userId,
    () => db.learningModule.findUnique({ where: { id }, include: { learning: true } }),
    (m: any) => m.learning?.userId ?? null,
  );
}

export async function getOwnedHabitLog(id: string, userId: string) {
  return owned(
    userId,
    () => db.habitLog.findUnique({ where: { id }, include: { habit: true } }),
    (l: any) => l.habit?.userId ?? null,
  );
}

// ---- Relation target validation ---------------------------------------------
// Verifies a referenced (foreign) entity belongs to the same user before we
// attach it to a record the caller owns.

async function assertRelationOwner(model: 'goal' | 'roadmap' | 'milestone' | 'learning' | 'event' | 'folder' | 'task' | 'habit', id: string | undefined | null, userId: string) {
  if (id === undefined || id === null || id === '') return;
  switch (model) {
    case 'goal': {
      const g = await db.goal.findUnique({ where: { id }, select: { id: true, userId: true } });
      if (!g || g.userId !== userId) throw new HttpError('Resource not found', 404);
      return;
    }
    case 'roadmap': {
      const r = await db.roadmap.findUnique({ where: { id }, select: { id: true, userId: true } });
      if (!r || r.userId !== userId) throw new HttpError('Resource not found', 404);
      return;
    }
    case 'milestone': {
      const m = await db.milestone.findUnique({
        where: { id },
        select: { id: true, goal: { select: { userId: true } }, roadmap: { select: { userId: true } } },
      });
      const owner = m?.goal?.userId ?? m?.roadmap?.userId ?? null;
      if (!m || owner !== userId) throw new HttpError('Resource not found', 404);
      return;
    }
    case 'learning': {
      const l = await db.learning.findUnique({ where: { id }, select: { id: true, userId: true } });
      if (!l || l.userId !== userId) throw new HttpError('Resource not found', 404);
      return;
    }
    case 'event': {
      const e = await db.event.findUnique({ where: { id }, select: { id: true, userId: true } });
      if (!e || e.userId !== userId) throw new HttpError('Resource not found', 404);
      return;
    }
    case 'folder': {
      const f = await db.folder.findUnique({ where: { id }, select: { id: true, userId: true } });
      if (!f || f.userId !== userId) throw new HttpError('Resource not found', 404);
      return;
    }
    case 'task': {
      const t = await db.task.findUnique({ where: { id }, select: { id: true, userId: true } });
      if (!t || t.userId !== userId) throw new HttpError('Resource not found', 404);
      return;
    }
    case 'habit': {
      const h = await db.habit.findUnique({ where: { id }, select: { id: true, userId: true } });
      if (!h || h.userId !== userId) throw new HttpError('Resource not found', 404);
      return;
    }
  }
}

export function validateGoalRelation(id: string | undefined | null, userId: string) {
  return assertRelationOwner('goal', id, userId);
}
export function validateRoadmapRelation(id: string | undefined | null, userId: string) {
  return assertRelationOwner('roadmap', id, userId);
}
export function validateMilestoneRelation(id: string | undefined | null, userId: string) {
  return assertRelationOwner('milestone', id, userId);
}
export function validateLearningRelation(id: string | undefined | null, userId: string) {
  return assertRelationOwner('learning', id, userId);
}
export function validateEventRelation(id: string | undefined | null, userId: string) {
  return assertRelationOwner('event', id, userId);
}
export function validateFolderRelation(id: string | undefined | null, userId: string) {
  return assertRelationOwner('folder', id, userId);
}
export function validateTaskRelation(id: string | undefined | null, userId: string) {
  return assertRelationOwner('task', id, userId);
}
export function validateHabitRelation(id: string | undefined | null, userId: string) {
  return assertRelationOwner('habit', id, userId);
}