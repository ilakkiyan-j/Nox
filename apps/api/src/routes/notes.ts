import { Router, Request, Response } from 'express';
import { db } from '@nox/database';
import { apiError, apiResponse, HttpError } from '../lib/http';
import { getOwnedFolder, getOwnedNote, validateEventRelation, validateFolderRelation, validateGoalRelation, validateLearningRelation, validateTaskRelation } from '../lib/ownership';
import { isSafeString, LIMITS, limitString, parseSafeUrl } from '../lib/validate';

const router = Router();

// ---- Folders -----------------------------------------------------------------

router.get('/folders', async (req: Request, res: Response) => {
  try {
    const folders = await db.folder.findMany({
      where: { userId: req.user!.id },
      include: { _count: { select: { notes: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return apiResponse(res, folders);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load folders';
    return apiError(res, message, 500);
  }
});

router.post('/folders', async (req: Request, res: Response) => {
  try {
    const { name, icon, color } = (req.body ?? {}) as Record<string, unknown>;
    if (!isSafeString(name)) return apiError(res, 'Folder name is required');

    const folder = await db.folder.create({
      data: {
        userId: req.user!.id,
        name: limitString(name.trim(), 100),
        icon: typeof icon === 'string' && icon.trim() ? limitString(icon.trim(), 50) : 'folder',
        color: typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : '#6366F1',
      },
    });
    return apiResponse(res, folder, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create folder';
    return apiError(res, message, 500);
  }
});

router.patch('/folders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await getOwnedFolder(id, req.user!.id);

    const { name, icon, color } = (req.body ?? {}) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (name !== undefined) {
      if (!isSafeString(name)) return apiError(res, 'Folder name must be a non-empty string');
      data.name = limitString(name.trim(), 100);
    }
    if (icon !== undefined) data.icon = typeof icon === 'string' && icon.trim() ? limitString(icon.trim(), 50) : null;
    if (color !== undefined) data.color = typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : null;

    const updated = await db.folder.update({ where: { id }, data });
    return apiResponse(res, updated);
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to update folder';
    return apiError(res, message, 500);
  }
});

router.delete('/folders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const folder = await getOwnedFolder(id, req.user!.id);
    if (folder.isSystem) {
      return apiError(res, 'System folders cannot be deleted', 400);
    }

    const unsorted = await db.folder.findFirst({ where: { userId: req.user!.id, isSystem: true, name: 'Unsorted' } });
    if (unsorted) {
      await db.note.updateMany({ where: { folderId: id }, data: { folderId: unsorted.id } });
    }

    await db.folder.delete({ where: { id } });
    return apiResponse(res, { deleted: true, id });
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to delete folder';
    return apiError(res, message, 500);
  }
});

// ---- Notes -------------------------------------------------------------------

router.get('/notes', async (req: Request, res: Response) => {
  try {
    const { folderId, q } = req.query;
    const where: Record<string, unknown> = { userId: req.user!.id };
    if (typeof folderId === 'string' && folderId) {
      await validateFolderRelation(folderId, req.user!.id);
      where.folderId = folderId;
    }
    if (typeof q === 'string' && q.trim()) {
      where.OR = [
        { title: { contains: q.trim() } },
        { content: { contains: q.trim() } },
        { tags: { contains: q.trim() } },
      ];
    }

    const notes = await db.note.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { folder: true, goal: true, task: true, event: true, learning: true },
    });
    return apiResponse(res, notes);
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to load notes';
    return apiError(res, message, 500);
  }
});

router.post('/notes', async (req: Request, res: Response) => {
  try {
    const { title, content, url, folderId, tags, goalId, taskId, eventId, learningId } = (req.body ?? {}) as Record<string, unknown>;

    await Promise.all([
      validateFolderRelation(folderId as string | undefined, req.user!.id),
      validateGoalRelation(goalId as string | undefined, req.user!.id),
      validateTaskRelation(taskId as string | undefined, req.user!.id),
      validateEventRelation(eventId as string | undefined, req.user!.id),
      validateLearningRelation(learningId as string | undefined, req.user!.id),
    ]);

    const urlCheck = parseSafeUrl(url);
    if (!urlCheck.ok) return apiError(res, urlCheck.error, 400);

    const contentStr = typeof content === 'string' ? limitString(content, LIMITS.noteContent) : '';
    const titleStr =
      typeof title === 'string' && title.trim()
        ? limitString(title.trim(), LIMITS.noteTitle)
        : contentStr.slice(0, 30) + (contentStr.length > 30 ? '...' : '') || 'Quick Note';

    let targetFolderId = folderId as string | null | undefined;
    if (!targetFolderId) {
      const unsorted = await db.folder.findFirst({ where: { userId: req.user!.id, isSystem: true, name: 'Unsorted' } });
      if (unsorted) targetFolderId = unsorted.id;
    }

    const normalizedTags = Array.isArray(tags)
      ? tags.filter((t: unknown) => typeof t === 'string').map((t: string) => t.trim()).filter(Boolean).slice(0, 20)
      : [];

    const note = await db.note.create({
      data: {
        userId: req.user!.id,
        title: titleStr,
        content: contentStr,
        url: urlCheck.value,
        folderId: targetFolderId || null,
        tags: typeof tags === 'string' ? limitString(tags, 1000) : JSON.stringify(normalizedTags),
        goalId: (goalId as string) || null,
        taskId: (taskId as string) || null,
        eventId: (eventId as string) || null,
        learningId: (learningId as string) || null,
      },
      include: { folder: true },
    });
    return apiResponse(res, note, 201);
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to create note';
    return apiError(res, message, 500);
  }
});

router.patch('/notes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await getOwnedNote(id, req.user!.id);

    const { title, content, url, folderId } = (req.body ?? {}) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (title !== undefined) {
      if (!isSafeString(title, 0, LIMITS.noteTitle)) return apiError(res, 'Title is too long');
      data.title = title.trim() || 'Quick Note';
    }
    if (content !== undefined) data.content = typeof content === 'string' ? limitString(content, LIMITS.noteContent) : content;
    if (url !== undefined) {
      const urlCheck = parseSafeUrl(url);
      if (!urlCheck.ok) return apiError(res, urlCheck.error, 400);
      data.url = urlCheck.value;
    }
    if (folderId !== undefined) {
      await validateFolderRelation(folderId as string | undefined, req.user!.id);
      data.folderId = (folderId as string) || null;
    }

    const updated = await db.note.update({ where: { id }, data });
    return apiResponse(res, updated);
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to update note';
    return apiError(res, message, 500);
  }
});

router.delete('/notes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await getOwnedNote(id, req.user!.id);
    await db.note.delete({ where: { id } });
    return apiResponse(res, { deleted: true, id });
  } catch (err: unknown) {
    if (err instanceof HttpError) return apiError(res, err.message, err.statusCode);
    const message = err instanceof Error ? err.message : 'Failed to delete note';
    return apiError(res, message, 500);
  }
});

export default router;