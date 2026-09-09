import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { db } from '@nox/database';
import healthRouter from './routes/health';
import { globalErrorHandler } from './middleware/error';

import rateLimit from 'express-rate-limit';

const app = express();
const PORT = process.env.PORT || 4000;

// Security response headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Rate limiting security rules
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: { message: 'Too many login attempts. Please try again in 15 minutes.' } },
});

const importLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { success: false, error: { message: 'Too many roadmap import requests. Please try again later.' } },
});

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/roadmaps/import', importLimiter);
app.use('/api/v1', healthRouter);

// Utility helper for standardized JSON API responses
function apiResponse<T>(res: Response, data: T, status = 200, message?: string) {
  return res.status(status).json({
    success: true,
    data,
    message,
  });
}

function apiError(res: Response, message: string, status = 400, details?: any) {
  return res.status(status).json({
    success: false,
    error: {
      message,
      details,
    },
  });
}

// User Context Resolver: Resolves logged-in user from headers/params or falls back to first seed user
async function getTargetUser(req: Request) {
  const headerId = req.headers['x-user-id'] as string;
  const queryId = req.query.userId as string;
  const bodyId = req.body?.userId as string;
  const requestedId = headerId || queryId || bodyId;

  if (requestedId && typeof requestedId === 'string' && requestedId.trim().length > 0) {
    const found = await db.user.findUnique({ where: { id: requestedId.trim() } });
    if (found) return found;
  }

  const defaultUser = await db.user.findFirst();
  return defaultUser;
}

// 1. Auth Login (Gmail & Password validation)
app.post('/api/v1/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return apiError(res, 'Email and password are required');
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || user.password !== password) {
      return apiError(res, 'Invalid credentials. Please check your email and password.', 401);
    }

    return apiResponse(res, user, 200, 'Authentication successful');
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.get('/api/v1/auth/me', async (req: Request, res: Response) => {
  try {
    const user = await getTargetUser(req);
    if (!user) return apiError(res, 'No user found', 404);
    return apiResponse(res, user);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

// 2. Admin User Account Management Endpoints
app.get('/api/v1/admin/users', async (req: Request, res: Response) => {
  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        headline: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return apiResponse(res, users);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.post('/api/v1/admin/users', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, headline } = req.body;
    if (!name || !email || !password) {
      return apiError(res, 'Name, Email (Gmail), and Password are required');
    }

    const existing = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return apiError(res, 'An account with this email already exists');
    }

    const newUser = await db.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        password,
        role: role || 'USER',
        headline: headline || 'Second Self System User',
      },
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

    return apiResponse(res, newUser, 201, 'User account created successfully by Admin');
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.patch('/api/v1/admin/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, headline } = req.body;

    const updated = await db.user.update({
      where: { id },
      data: {
        name,
        email: email ? email.toLowerCase().trim() : undefined,
        password,
        role,
        headline,
      },
    });
    return apiResponse(res, updated);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.delete('/api/v1/admin/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Cascading delete for user data
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
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

// 3. Dashboard Aggregation Endpoint (User Isolated)
app.get('/api/v1/dashboard', async (req: Request, res: Response) => {
  try {
    const user = await getTargetUser(req);
    if (!user) return apiError(res, 'User not found', 404);

    const [tasks, upcomingEvents, activeGoals, activeLearning, habits, reminders, unreadNotifications, recentNotes] = await Promise.all([
      db.task.findMany({
        where: { userId: user.id, status: { in: ['TODO', 'IN_PROGRESS'] } },
        orderBy: { dueDate: 'asc' },
        take: 5,
        include: { goal: true, milestone: true },
      }),
      db.event.findMany({
        where: { userId: user.id },
        orderBy: { date: 'asc' },
        take: 3,
        include: { goal: true },
      }),
      db.goal.findMany({
        where: { userId: user.id, status: 'IN_PROGRESS' },
        take: 4,
        include: { roadmaps: true, milestones: true },
      }),
      db.learning.findMany({
        where: { userId: user.id, status: 'IN_PROGRESS' },
        take: 3,
        include: { modules: true },
      }),
      db.habit.findMany({
        where: { userId: user.id },
        include: { logs: true },
      }),
      db.reminder.findMany({
        where: { userId: user.id, isCompleted: false },
        orderBy: { remindAt: 'asc' },
        take: 4,
      }),
      db.notification.findMany({
        where: { userId: user.id, isRead: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      db.note.findMany({
        where: { userId: user.id },
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
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

// 4. Goals CRUD (User Isolated)
app.get('/api/v1/goals', async (req: Request, res: Response) => {
  try {
    const user = await getTargetUser(req);
    if (!user) return apiError(res, 'User not found', 404);

    const goals = await db.goal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        roadmaps: { include: { milestones: true } },
        milestones: true,
        tasks: true,
        learnings: true,
        events: true,
        notes: true,
      },
    });
    return apiResponse(res, goals);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.post('/api/v1/goals', async (req: Request, res: Response) => {
  try {
    const user = await getTargetUser(req);
    if (!user) return apiError(res, 'User not found', 404);
    const { title, description, targetDate, startDate, status } = req.body;
    if (!title) return apiError(res, 'Title is required');

    const goal = await db.goal.create({
      data: {
        userId: user.id,
        title,
        description,
        status: status || 'IN_PROGRESS',
        startDate: startDate ? new Date(startDate) : new Date(),
        targetDate: targetDate ? new Date(targetDate) : null,
      },
    });
    return apiResponse(res, goal, 201);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.patch('/api/v1/goals/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, status, targetDate, startDate } = req.body;
    const updated = await db.goal.update({
      where: { id },
      data: {
        title,
        description,
        status,
        targetDate: targetDate !== undefined ? (targetDate ? new Date(targetDate) : null) : undefined,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
      },
    });
    return apiResponse(res, updated);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.delete('/api/v1/goals/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Safe cascading delete for Goal and child entities
    await db.$transaction([
      db.task.deleteMany({ where: { goalId: id } }),
      db.milestone.deleteMany({ where: { goalId: id } }),
      db.roadmap.deleteMany({ where: { goalId: id } }),
      db.learning.deleteMany({ where: { goalId: id } }),
      db.event.deleteMany({ where: { goalId: id } }),
      db.note.deleteMany({ where: { goalId: id } }),
      db.reminder.deleteMany({ where: { entityType: 'GOAL', entityId: id } }),
      db.goal.delete({ where: { id } }),
    ]);

    return apiResponse(res, { deleted: true, id });
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

// 5. Roadmaps CRUD (User Isolated)
app.get('/api/v1/roadmaps', async (req: Request, res: Response) => {
  try {
    const user = await getTargetUser(req);
    if (!user) return apiError(res, 'User not found', 404);

    const roadmaps = await db.roadmap.findMany({
      where: { goal: { userId: user.id } },
      include: { goal: true, milestones: true, tasks: true, learnings: true },
    });
    return apiResponse(res, roadmaps);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.post('/api/v1/roadmaps', async (req: Request, res: Response) => {
  try {
    const { goalId, title, description } = req.body;
    const roadmap = await db.roadmap.create({
      data: { goalId, title, description },
    });
    return apiResponse(res, roadmap, 201);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.post('/api/v1/roadmaps/import', async (req: Request, res: Response) => {
  try {
    const user = await getTargetUser(req);
    if (!user) return apiError(res, 'User not found', 404);

    const { goalId, title, description, milestones } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return apiError(res, 'Invalid plan payload: "title" is required and must be a non-empty string', 400);
    }

    if (!milestones || !Array.isArray(milestones) || milestones.length === 0) {
      return apiError(res, 'Invalid plan payload: "milestones" must be a non-empty array of milestone objects', 400);
    }

    const createdRoadmap = await db.$transaction(async (tx) => {
      const roadmap = await tx.roadmap.create({
        data: {
          goalId: goalId || null,
          title: title.trim(),
          description: description || 'Imported via Roadmap JSON Plan',
        },
      });

      for (let mIdx = 0; mIdx < milestones.length; mIdx++) {
        const m = milestones[mIdx];
        if (!m.title || typeof m.title !== 'string') {
          throw new Error(`Milestone at index ${mIdx} missing required "title" string property`);
        }

        const milestone = await tx.milestone.create({
          data: {
            goalId: goalId || null,
            roadmapId: roadmap.id,
            title: m.title.trim(),
            description: m.description || null,
            order: mIdx + 1,
            targetDate: m.targetDate ? new Date(m.targetDate) : null,
          },
        });

        if (Array.isArray(m.tasks)) {
          for (let tIdx = 0; tIdx < m.tasks.length; tIdx++) {
            const t = m.tasks[tIdx];
            if (t.title && typeof t.title === 'string') {
              await tx.task.create({
                data: {
                  userId: user.id,
                  goalId: goalId || null,
                  roadmapId: roadmap.id,
                  milestoneId: milestone.id,
                  title: t.title.trim(),
                  description: t.description || null,
                  priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(t.priority) ? t.priority : 'MEDIUM',
                  estimatedMinutes: typeof t.estimatedMinutes === 'number' ? t.estimatedMinutes : null,
                },
              });
            }
          }
        }
      }

      return tx.roadmap.findUnique({
        where: { id: roadmap.id },
        include: { milestones: { include: { tasks: true } } },
      });
    });

    await db.notification.create({
      data: {
        userId: user.id,
        title: '🗺️ Roadmap Plan Imported',
        message: `Successfully imported "${createdRoadmap?.title}" with ${createdRoadmap?.milestones.length} milestones.`,
        type: 'ROADMAP_UPDATED',
        entityType: 'ROADMAP',
        entityId: createdRoadmap?.id,
      },
    });

    return apiResponse(res, createdRoadmap, 201, 'Roadmap imported successfully');
  } catch (err: any) {
    return apiError(res, `Roadmap import failed: ${err.message}`, 400);
  }
});

app.patch('/api/v1/roadmaps/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, status } = req.body;
    const updated = await db.roadmap.update({
      where: { id },
      data: { title, description, status },
    });
    return apiResponse(res, updated);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.delete('/api/v1/roadmaps/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.$transaction([
      db.task.deleteMany({ where: { roadmapId: id } }),
      db.milestone.deleteMany({ where: { roadmapId: id } }),
      db.roadmap.delete({ where: { id } }),
    ]);
    return apiResponse(res, { deleted: true, id });
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.get('/api/v1/milestones', async (req: Request, res: Response) => {
  try {
    const user = await getTargetUser(req);
    if (!user) return apiError(res, 'User not found', 404);

    const milestones = await db.milestone.findMany({
      where: { OR: [{ goal: { userId: user.id } }, { roadmap: { goal: { userId: user.id } } }] },
      include: { goal: true, roadmap: true, tasks: true },
      orderBy: { order: 'asc' },
    });
    return apiResponse(res, milestones);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.post('/api/v1/milestones', async (req: Request, res: Response) => {
  try {
    const { goalId, roadmapId, title, description, targetDate } = req.body;
    const milestone = await db.milestone.create({
      data: {
        goalId,
        roadmapId,
        title,
        description,
        targetDate: targetDate ? new Date(targetDate) : null,
      },
    });
    return apiResponse(res, milestone, 201);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.patch('/api/v1/milestones/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, title, description } = req.body;

    const updateData: any = { status, title, description };
    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    const milestone = await db.milestone.update({
      where: { id },
      data: updateData,
    });

    if (status === 'COMPLETED') {
      const user = await getTargetUser(req);
      if (user) {
        await db.notification.create({
          data: {
            userId: user.id,
            title: '🎉 Milestone Achieved',
            message: `Milestone "${milestone.title}" was completed!`,
            type: 'MILESTONE_ACHIEVED',
            entityType: 'MILESTONE',
            entityId: milestone.id,
          },
        });
      }
    }

    return apiResponse(res, milestone);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.delete('/api/v1/milestones/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.$transaction([
      db.task.deleteMany({ where: { milestoneId: id } }),
      db.milestone.delete({ where: { id } }),
    ]);
    return apiResponse(res, { deleted: true, id });
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

// 6. Tasks CRUD (User Isolated)
app.get('/api/v1/tasks', async (req: Request, res: Response) => {
  try {
    const user = await getTargetUser(req);
    if (!user) return apiError(res, 'User not found', 404);

    const tasks = await db.task.findMany({
      where: { userId: user.id },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      include: { goal: true, roadmap: true, milestone: true, learning: true, event: true },
    });
    return apiResponse(res, tasks);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.post('/api/v1/tasks', async (req: Request, res: Response) => {
  try {
    const user = await getTargetUser(req);
    if (!user) return apiError(res, 'User not found', 404);
    const { title, description, priority, dueDate, estimatedMinutes, goalId, roadmapId, milestoneId, learningId, eventId } = req.body;
    if (!title) return apiError(res, 'Task title required');

    const task = await db.task.create({
      data: {
        userId: user.id,
        title,
        description,
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes) : null,
        goalId,
        roadmapId,
        milestoneId,
        learningId,
        eventId,
      },
    });
    return apiResponse(res, task, 201);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.patch('/api/v1/tasks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, dueDate, estimatedMinutes, goalId } = req.body;
    const updated = await db.task.update({
      where: { id },
      data: {
        title,
        description,
        status,
        priority,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
        estimatedMinutes: estimatedMinutes !== undefined ? (estimatedMinutes ? parseInt(estimatedMinutes) : null) : undefined,
        goalId: goalId !== undefined ? (goalId || null) : undefined,
      },
    });
    return apiResponse(res, updated);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.delete('/api/v1/tasks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.$transaction([
      db.note.deleteMany({ where: { taskId: id } }),
      db.task.delete({ where: { id } }),
    ]);
    return apiResponse(res, { deleted: true, id });
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

// 7. Learning CRUD (User Isolated)
app.get('/api/v1/learning', async (req: Request, res: Response) => {
  try {
    const user = await getTargetUser(req);
    if (!user) return apiError(res, 'User not found', 404);

    const learning = await db.learning.findMany({
      where: { userId: user.id },
      include: { modules: { orderBy: { order: 'asc' } }, goal: true, tasks: true, notes: true },
    });
    return apiResponse(res, learning);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.post('/api/v1/learning', async (req: Request, res: Response) => {
  try {
    const user = await getTargetUser(req);
    if (!user) return apiError(res, 'User not found', 404);
    const { title, type, goalId, modules } = req.body;

    const learning = await db.learning.create({
      data: {
        userId: user.id,
        title,
        type: type || 'COURSE',
        goalId,
        totalModules: Array.isArray(modules) ? modules.length : 0,
        modules: Array.isArray(modules)
          ? {
              create: modules.map((m: any, idx: number) => ({
                title: typeof m === 'string' ? m : m.title,
                order: idx + 1,
              })),
            }
          : undefined,
      },
      include: { modules: true },
    });
    return apiResponse(res, learning, 201);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.patch('/api/v1/learning/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, type, status } = req.body;
    const updated = await db.learning.update({
      where: { id },
      data: { title, type, status },
    });
    return apiResponse(res, updated);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.delete('/api/v1/learning/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.$transaction([
      db.learningModule.deleteMany({ where: { learningId: id } }),
      db.task.deleteMany({ where: { learningId: id } }),
      db.note.deleteMany({ where: { learningId: id } }),
      db.learning.delete({ where: { id } }),
    ]);
    return apiResponse(res, { deleted: true, id });
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.patch('/api/v1/learning/modules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, title } = req.body;

    const updateData: any = {};
    if (status !== undefined) {
      updateData.status = status;
      updateData.completedAt = status === 'COMPLETED' ? new Date() : null;
    }
    if (title !== undefined) {
      updateData.title = title;
    }

    const updatedModule = await db.learningModule.update({
      where: { id },
      data: updateData,
    });

    const allModules = await db.learningModule.findMany({ where: { learningId: updatedModule.learningId } });
    const completedCount = allModules.filter((m: any) => m.status === 'COMPLETED').length;
    await db.learning.update({
      where: { id: updatedModule.learningId },
      data: {
        completedModules: completedCount,
        status: completedCount === allModules.length && allModules.length > 0 ? 'COMPLETED' : 'IN_PROGRESS',
      },
    });

    return apiResponse(res, updatedModule);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.post('/api/v1/learning/:id/modules', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    if (!title) return apiError(res, 'Module title is required');

    const existingCount = await db.learningModule.count({ where: { learningId: id } });
    const moduleItem = await db.learningModule.create({
      data: {
        learningId: id,
        title,
        order: existingCount + 1,
      },
    });

    const totalCount = existingCount + 1;
    await db.learning.update({
      where: { id },
      data: { totalModules: totalCount },
    });

    return apiResponse(res, moduleItem, 201);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.delete('/api/v1/learning/modules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const moduleItem = await db.learningModule.findUnique({ where: { id } });
    if (!moduleItem) return apiError(res, 'Module not found', 404);

    const learningId = moduleItem.learningId;
    await db.learningModule.delete({ where: { id } });

    const remainingModules = await db.learningModule.findMany({ where: { learningId } });
    const completedCount = remainingModules.filter((m: any) => m.status === 'COMPLETED').length;
    await db.learning.update({
      where: { id: learningId },
      data: {
        totalModules: remainingModules.length,
        completedModules: completedCount,
      },
    });

    return apiResponse(res, { deleted: true, id });
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

// 8. Events CRUD (User Isolated)
app.get('/api/v1/events', async (req: Request, res: Response) => {
  try {
    const user = await getTargetUser(req);
    if (!user) return apiError(res, 'User not found', 404);

    const events = await db.event.findMany({
      where: { userId: user.id },
      orderBy: { date: 'asc' },
      include: { goal: true, tasks: true, notes: true },
    });
    return apiResponse(res, events);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.post('/api/v1/events', async (req: Request, res: Response) => {
  try {
    const user = await getTargetUser(req);
    if (!user) return apiError(res, 'User not found', 404);
    const { title, description, date, startTime, endTime, location, url, isOnline, goalId } = req.body;

    const event = await db.event.create({
      data: {
        userId: user.id,
        title,
        description,
        date: new Date(date),
        startTime,
        endTime,
        location,
        url,
        isOnline: isOnline !== undefined ? isOnline : true,
        goalId,
      },
    });
    return apiResponse(res, event, 201);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.patch('/api/v1/events/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, date, startTime, endTime, location, url, isOnline } = req.body;
    const updated = await db.event.update({
      where: { id },
      data: {
        title,
        description,
        date: date ? new Date(date) : undefined,
        startTime,
        endTime,
        location,
        url,
        isOnline,
      },
    });
    return apiResponse(res, updated);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.delete('/api/v1/events/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.$transaction([
      db.task.deleteMany({ where: { eventId: id } }),
      db.note.deleteMany({ where: { eventId: id } }),
      db.event.delete({ where: { id } }),
    ]);
    return apiResponse(res, { deleted: true, id });
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

// 9. Habits CRUD & Check-in (User Isolated)
app.get('/api/v1/habits', async (req: Request, res: Response) => {
  try {
    const user = await getTargetUser(req);
    if (!user) return apiError(res, 'User not found', 404);

    const habits = await db.habit.findMany({
      where: { userId: user.id },
      include: { logs: { orderBy: { createdAt: 'desc' } } },
    });
    return apiResponse(res, habits);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.post('/api/v1/habits', async (req: Request, res: Response) => {
  try {
    const user = await getTargetUser(req);
    if (!user) return apiError(res, 'User not found', 404);
    const { title, frequency, targetCount, reminderTime } = req.body;

    const habit = await db.habit.create({
      data: {
        userId: user.id,
        title,
        frequency: frequency || 'DAILY',
        targetCount: targetCount || 1,
        reminderTime,
      },
    });
    return apiResponse(res, habit, 201);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.patch('/api/v1/habits/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, frequency, reminderTime, targetCount } = req.body;
    const dataToUpdate: any = {};
    if (title !== undefined) dataToUpdate.title = title;
    if (frequency !== undefined) dataToUpdate.frequency = frequency;
    if (reminderTime !== undefined) dataToUpdate.reminderTime = reminderTime;
    if (targetCount !== undefined) dataToUpdate.targetCount = typeof targetCount === 'number' ? targetCount : parseInt(targetCount);

    const updated = await db.habit.update({
      where: { id },
      data: dataToUpdate,
    });
    return apiResponse(res, updated);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.delete('/api/v1/habits/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.$transaction([
      db.habitLog.deleteMany({ where: { habitId: id } }),
      db.habit.delete({ where: { id } }),
    ]);
    return apiResponse(res, { deleted: true, id });
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.post('/api/v1/habits/:id/log', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { date, status, notes } = req.body;
    const dateStr = date || new Date().toISOString().split('T')[0];

    const existingLog = await db.habitLog.findFirst({
      where: { habitId: id, date: dateStr },
    });

    if (existingLog) {
      const updatedLog = await db.habitLog.update({
        where: { id: existingLog.id },
        data: { status: status || 'COMPLETED', notes },
      });
      return apiResponse(res, updatedLog);
    }

    const habitLog = await db.habitLog.create({
      data: {
        habitId: id,
        date: dateStr,
        status: status || 'COMPLETED',
        notes,
      },
    });

    const habit = await db.habit.findUnique({ where: { id } });
    if (habit && status === 'COMPLETED') {
      const newStreak = habit.streakCount + 1;
      const newBest = Math.max(newStreak, habit.bestStreak);
      await db.habit.update({
        where: { id },
        data: { streakCount: newStreak, bestStreak: newBest },
      });
    }

    return apiResponse(res, habitLog, 201);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

// 10. Notes & Folders (User Isolated)
app.get('/api/v1/folders', async (req: Request, res: Response) => {
  try {
    const user = await getTargetUser(req);
    if (!user) return apiError(res, 'User not found', 404);

    const folders = await db.folder.findMany({
      where: { userId: user.id },
      include: { _count: { select: { notes: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return apiResponse(res, folders);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.post('/api/v1/folders', async (req: Request, res: Response) => {
  try {
    const user = await getTargetUser(req);
    if (!user) return apiError(res, 'User not found', 404);
    const { name, icon, color } = req.body;

    const folder = await db.folder.create({
      data: {
        userId: user.id,
        name,
        icon: icon || 'folder',
        color: color || '#6366F1',
      },
    });
    return apiResponse(res, folder, 201);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.delete('/api/v1/folders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const folder = await db.folder.findUnique({ where: { id } });
    if (!folder) return apiError(res, 'Folder not found', 404);
    if (folder.isSystem) return apiError(res, 'Cannot delete system folders', 400);

    const user = await getTargetUser(req);
    if (user) {
      const unsorted = await db.folder.findFirst({ where: { userId: user.id, isSystem: true, name: 'Unsorted' } });
      if (unsorted) {
        await db.note.updateMany({
          where: { folderId: id },
          data: { folderId: unsorted.id },
        });
      }
    }

    await db.folder.delete({ where: { id } });
    return apiResponse(res, { deleted: true, id });
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.patch('/api/v1/folders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, icon, color } = req.body;
    const updated = await db.folder.update({
      where: { id },
      data: { name, icon, color },
    });
    return apiResponse(res, updated);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.get('/api/v1/notes', async (req: Request, res: Response) => {
  try {
    const user = await getTargetUser(req);
    if (!user) return apiError(res, 'User not found', 404);

    const { folderId } = req.query;
    const where: any = { userId: user.id };
    if (folderId) where.folderId = folderId as string;

    const notes = await db.note.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { folder: true, goal: true, task: true, event: true, learning: true },
    });
    return apiResponse(res, notes);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.post('/api/v1/notes', async (req: Request, res: Response) => {
  try {
    const user = await getTargetUser(req);
    if (!user) return apiError(res, 'User not found', 404);
    const { title, content, url, folderId, tags, goalId, taskId, eventId, learningId } = req.body;

    let targetFolderId = folderId;
    if (!targetFolderId) {
      const unsorted = await db.folder.findFirst({ where: { userId: user.id, isSystem: true, name: 'Unsorted' } });
      if (unsorted) targetFolderId = unsorted.id;
    }

    const note = await db.note.create({
      data: {
        userId: user.id,
        title: title || (content ? content.slice(0, 30) + '...' : 'Quick Note'),
        content: content || '',
        url,
        folderId: targetFolderId,
        tags: typeof tags === 'string' ? tags : JSON.stringify(tags || []),
        goalId,
        taskId,
        eventId,
        learningId,
      },
      include: { folder: true },
    });
    return apiResponse(res, note, 201);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.patch('/api/v1/notes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, url, folderId } = req.body;
    const dataToUpdate: any = {};
    if (title !== undefined) dataToUpdate.title = title;
    if (content !== undefined) dataToUpdate.content = content;
    if (url !== undefined) dataToUpdate.url = url;
    if (folderId !== undefined) dataToUpdate.folderId = folderId || null;

    const updated = await db.note.update({
      where: { id },
      data: dataToUpdate,
    });
    return apiResponse(res, updated);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.delete('/api/v1/notes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.note.delete({ where: { id } });
    return apiResponse(res, { deleted: true, id });
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

// 11. Reminders (User Isolated)
app.get('/api/v1/reminders', async (req: Request, res: Response) => {
  try {
    const user = await getTargetUser(req);
    if (!user) return apiError(res, 'User not found', 404);

    const reminders = await db.reminder.findMany({
      where: { userId: user.id },
      orderBy: { remindAt: 'asc' },
    });
    return apiResponse(res, reminders);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.post('/api/v1/reminders', async (req: Request, res: Response) => {
  try {
    const user = await getTargetUser(req);
    if (!user) return apiError(res, 'User not found', 404);
    const { title, remindAt, entityType, entityId } = req.body;

    const reminder = await db.reminder.create({
      data: {
        userId: user.id,
        title,
        remindAt: new Date(remindAt),
        entityType,
        entityId,
      },
    });
    return apiResponse(res, reminder, 201);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.patch('/api/v1/reminders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, remindAt, isCompleted } = req.body;
    const updated = await db.reminder.update({
      where: { id },
      data: {
        title,
        remindAt: remindAt ? new Date(remindAt) : undefined,
        isCompleted,
      },
    });
    return apiResponse(res, updated);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.delete('/api/v1/reminders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.reminder.delete({ where: { id } });
    return apiResponse(res, { deleted: true, id });
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

// 12. Notifications Center API Endpoints (User Isolated)
app.get('/api/v1/notifications', async (req: Request, res: Response) => {
  try {
    const user = await getTargetUser(req);
    if (!user) return apiError(res, 'User not found', 404);

    const notifications = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return apiResponse(res, notifications);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.post('/api/v1/notifications', async (req: Request, res: Response) => {
  try {
    const user = await getTargetUser(req);
    if (!user) return apiError(res, 'User not found', 404);

    const { title, message, type, entityType, entityId } = req.body;
    if (!title || !message) {
      return apiError(res, 'Title and message are required', 400);
    }

    const notif = await db.notification.create({
      data: {
        userId: user.id,
        title,
        message,
        type: type || 'GENERAL',
        entityType,
        entityId,
      },
    });
    return apiResponse(res, notif, 201);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.patch('/api/v1/notifications/mark-all-read', async (req: Request, res: Response) => {
  try {
    const user = await getTargetUser(req);
    if (!user) return apiError(res, 'User not found', 404);

    await db.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });
    return apiResponse(res, { success: true });
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.patch('/api/v1/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await db.notification.update({
      where: { id },
      data: { isRead: true },
    });
    return apiResponse(res, updated);
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.delete('/api/v1/notifications/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.notification.delete({ where: { id } });
    return apiResponse(res, { deleted: true, id });
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.delete('/api/v1/notifications', async (req: Request, res: Response) => {
  try {
    const user = await getTargetUser(req);
    if (!user) return apiError(res, 'User not found', 404);

    await db.notification.deleteMany({ where: { userId: user.id } });
    return apiResponse(res, { cleared: true });
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

// 13. Non-Grid Vertical Time Feed (User Isolated)
app.get('/api/v1/time', async (req: Request, res: Response) => {
  try {
    const user = await getTargetUser(req);
    if (!user) return apiError(res, 'User not found', 404);

    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [tasksToday, eventsUpcoming, remindersToday, habits] = await Promise.all([
      db.task.findMany({
        where: { userId: user.id, status: { in: ['TODO', 'IN_PROGRESS'] } },
        orderBy: { dueDate: 'asc' },
        include: { goal: true },
      }),
      db.event.findMany({
        where: { userId: user.id },
        orderBy: { date: 'asc' },
        include: { goal: true },
      }),
      db.reminder.findMany({
        where: { userId: user.id, isCompleted: false },
        orderBy: { remindAt: 'asc' },
      }),
      db.habit.findMany({
        where: { userId: user.id },
      }),
    ]);

    const nowItems: any[] = [];
    const nextItems: any[] = [];
    const upcomingItems: any[] = [];

    tasksToday.forEach((task: any, idx: number) => {
      const item = { type: 'TASK', ...task };
      if (task.status === 'IN_PROGRESS' || idx === 0) {
        nowItems.push(item);
      } else if (idx <= 2) {
        nextItems.push(item);
      } else {
        upcomingItems.push(item);
      }
    });

    eventsUpcoming.forEach((event: any) => {
      const item = { type: 'EVENT', ...event };
      const eventDate = new Date(event.date);
      if (eventDate <= endOfDay) {
        nextItems.push(item);
      } else {
        upcomingItems.push(item);
      }
    });

    remindersToday.forEach((r: any) => nextItems.push({ type: 'REMINDER', ...r }));
    habits.forEach((h: any) => nowItems.push({ type: 'HABIT', ...h }));

    return apiResponse(res, {
      now: nowItems,
      next: nextItems,
      upcoming: upcomingItems,
    });
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

// 14. Global Cross-Entity Search (User Isolated)
app.get('/api/v1/search', async (req: Request, res: Response) => {
  try {
    const user = await getTargetUser(req);
    if (!user) return apiError(res, 'User not found', 404);

    const query = (req.query.q as string) || '';
    if (!query || query.trim().length === 0) {
      return apiResponse(res, { goals: [], tasks: [], events: [], notes: [], learning: [] });
    }

    const q = query.trim();

    const [goals, tasks, events, notes, learning] = await Promise.all([
      db.goal.findMany({
        where: { userId: user.id, OR: [{ title: { contains: q } }, { description: { contains: q } }] },
        take: 4,
      }),
      db.task.findMany({
        where: { userId: user.id, OR: [{ title: { contains: q } }, { description: { contains: q } }] },
        take: 4,
      }),
      db.event.findMany({
        where: { userId: user.id, OR: [{ title: { contains: q } }, { description: { contains: q } }] },
        take: 4,
      }),
      db.note.findMany({
        where: { userId: user.id, OR: [{ title: { contains: q } }, { content: { contains: q } }, { tags: { contains: q } }] },
        take: 4,
        include: { folder: true },
      }),
      db.learning.findMany({
        where: { userId: user.id, title: { contains: q } },
        take: 4,
      }),
    ]);

    return apiResponse(res, {
      goals,
      tasks,
      events,
      notes,
      learning,
    });
  } catch (err: any) {
    return apiError(res, err.message, 500);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 NOX API Backend running on http://localhost:${PORT}`);
});
