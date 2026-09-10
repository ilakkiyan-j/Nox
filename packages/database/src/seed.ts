import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

async function main() {
  console.log('🌱 Seeding NOX database...');

  // 1. Clean existing data
  await prisma.notification.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.note.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.habitLog.deleteMany();
  await prisma.habit.deleteMany();
  await prisma.event.deleteMany();
  await prisma.learningModule.deleteMany();
  await prisma.task.deleteMany();
  await prisma.learning.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.roadmap.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Admin & Primary Users
  const hashedAdmin = await bcrypt.hash('admin123password', BCRYPT_ROUNDS);
  const hashedUser = await bcrypt.hash('user123password', BCRYPT_ROUNDS);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@nox.internal',
      name: 'System Admin',
      password: hashedAdmin,
      role: 'ADMIN',
      headline: 'NOX Master Architect & Administrator',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
  });

  const user = await prisma.user.create({
    data: {
      email: 'user@nox.internal',
      name: 'Nox Architect',
      password: hashedUser,
      role: 'USER',
      headline: 'Senior Forward Deployed Engineer (FDE)',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
  });

  console.log(`👤 Admin created: ${adminUser.email} / admin123password`);
  console.log(`👤 User created: ${user.email} / user123password`);

  // 3. Create System Folders
  const unsortedFolder = await prisma.folder.create({
    data: {
      userId: user.id,
      name: 'Unsorted',
      icon: 'inbox',
      color: '#64748B',
      isSystem: true,
    },
  });

  const jobsFolder = await prisma.folder.create({
    data: {
      userId: user.id,
      name: 'Jobs',
      icon: 'briefcase',
      color: '#6366F1',
      isSystem: false,
    },
  });

  const learningFolder = await prisma.folder.create({
    data: {
      userId: user.id,
      name: 'Learning',
      icon: 'book-open',
      color: '#10B981',
      isSystem: false,
    },
  });

  // 4. Create Goals
  const sdeGoal = await prisma.goal.create({
    data: {
      userId: user.id,
      title: 'Become a Senior Forward Deployed Engineer (FDE)',
      description: 'Master AI Agent Architecture, System Design, Backend Engineering, and Cloud Deployments.',
      status: 'IN_PROGRESS',
      startDate: new Date('2026-09-01'),
      targetDate: new Date('2026-12-31'),
    },
  });

  const productGoal = await prisma.goal.create({
    data: {
      userId: user.id,
      title: 'Build & Launch NOX Platform MVP',
      description: 'Design and engineer NOX as the ultimate personal operating system (Your Second Self).',
      status: 'IN_PROGRESS',
      startDate: new Date('2026-09-01'),
      targetDate: new Date('2026-10-15'),
    },
  });

  // 5. Create Roadmaps & Milestones
  const fdeRoadmap = await prisma.roadmap.create({
    data: {
      userId: user.id,
      goalId: sdeGoal.id,
      title: 'FDE Mastery Roadmap',
      description: 'Structured 5-phase engineering progression',
      status: 'IN_PROGRESS',
      order: 1,
    },
  });

  const m1 = await prisma.milestone.create({
    data: {
      goalId: sdeGoal.id,
      roadmapId: fdeRoadmap.id,
      title: 'Complete Advanced System Design & Distributed Systems',
      description: 'Distributed consensus, caching strategies, messaging systems, DB sharding.',
      status: 'COMPLETED',
      targetDate: new Date('2026-09-10'),
      completedAt: new Date('2026-09-07'),
      order: 1,
    },
  });

  const m2 = await prisma.milestone.create({
    data: {
      goalId: sdeGoal.id,
      roadmapId: fdeRoadmap.id,
      title: 'Build Autonomous AI Agent Systems',
      description: 'Tool invocation loops, context caching, multi-agent orchestrations.',
      status: 'IN_PROGRESS',
      targetDate: new Date('2026-09-25'),
      order: 2,
    },
  });

  // 6. Create Learning & Modules
  const backendLearning = await prisma.learning.create({
    data: {
      userId: user.id,
      title: 'Advanced NestJS & Enterprise Patterns',
      type: 'COURSE',
      status: 'IN_PROGRESS',
      totalModules: 5,
      completedModules: 3,
      goalId: sdeGoal.id,
      roadmapId: fdeRoadmap.id,
    },
  });

  await prisma.learningModule.createMany({
    data: [
      { learningId: backendLearning.id, title: 'Module 1: Custom Guards & Interceptors', order: 1, status: 'COMPLETED' },
      { learningId: backendLearning.id, title: 'Module 2: Prisma ORM Integration & Migrations', order: 2, status: 'COMPLETED' },
      { learningId: backendLearning.id, title: 'Module 3: Modular Architecture & Event Emitters', order: 3, status: 'COMPLETED' },
      { learningId: backendLearning.id, title: 'Module 4: Dynamic Modules & Microservices', order: 4, status: 'IN_PROGRESS' },
      { learningId: backendLearning.id, title: 'Module 5: End-to-End Testing & CI/CD Pipeline', order: 5, status: 'NOT_STARTED' },
    ],
  });

  // 7. Create Events
  const hackathonEvent = await prisma.event.create({
    data: {
      userId: user.id,
      title: 'Global AI Agent Hackathon 2026',
      description: 'Keynote and building autonomous context assistants.',
      date: new Date('2026-09-15'),
      startTime: '09:00 AM',
      endTime: '06:00 PM',
      location: 'San Francisco & Online',
      url: 'https://hackathon.ai/agent-2026',
      isOnline: true,
      goalId: sdeGoal.id,
    },
  });

  // 8. Create Tasks
  await prisma.task.createMany({
    data: [
      {
        userId: user.id,
        title: 'Solve 5 Hard System Design & Concurrency Problems',
        description: 'Focus on distributed lock algorithms and rate limiting.',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: new Date('2026-09-09'),
        estimatedMinutes: 90,
        goalId: sdeGoal.id,
        milestoneId: m2.id,
      },
      {
        userId: user.id,
        title: 'Refine Resume & Target FDE Roles at Top AI Labs',
        description: 'Highlight autonomous agent orchestration and real-time backend expertise.',
        status: 'TODO',
        priority: 'URGENT',
        dueDate: new Date('2026-09-12'),
        estimatedMinutes: 60,
        goalId: sdeGoal.id,
      },
      {
        userId: user.id,
        title: 'Finish NOX Custom Vertical Time Feed Interface',
        description: 'Implement Now / Next / Upcoming timeline blocks without grid constraints.',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: new Date('2026-09-09'),
        estimatedMinutes: 120,
        goalId: productGoal.id,
      },
    ],
  });

  // 9. Create Habits & Logs
  const dsaHabit = await prisma.habit.create({
    data: {
      userId: user.id,
      title: 'Practice DSA & System Architecture',
      frequency: 'DAILY',
      targetCount: 1,
      streakCount: 7,
      bestStreak: 14,
      reminderTime: '08:00 PM',
    },
  });

  await prisma.habitLog.create({
    data: {
      habitId: dsaHabit.id,
      date: '2026-09-08',
      status: 'COMPLETED',
      notes: 'Solved 2 graph theory questions.',
    },
  });

  // 10. Create Quick Capture Notes
  await prisma.note.createMany({
    data: [
      {
        userId: user.id,
        folderId: jobsFolder.id,
        title: 'Anthropic - Forward Deployed Engineer Role',
        content: 'Role requires strong TypeScript, Python, LLM orchestration, customer deployment.',
        url: 'https://anthropic.com/careers/fde-2026',
        tags: JSON.stringify(['jobs', 'fde', 'ai']),
        goalId: sdeGoal.id,
      },
      {
        userId: user.id,
        folderId: learningFolder.id,
        title: 'Distributed Systems Patterns Note',
        content: 'Raft consensus relies on leader election, log replication, and safety invariants.',
        url: 'https://raft.github.io/',
        tags: JSON.stringify(['systems', 'architecture']),
        goalId: sdeGoal.id,
      },
      {
        userId: user.id,
        folderId: unsortedFolder.id,
        title: 'Idea: Voice Clip Quick Capture for NOX',
        content: 'Future AI PA feature: Convert audio clip into structured note or task.',
        tags: JSON.stringify(['idea', 'nox']),
      },
    ],
  });

  // 11. Create Reminders & Notifications
  await prisma.reminder.create({
    data: {
      userId: user.id,
      title: 'Review System Design notes before evening mock interview',
      remindAt: new Date('2026-09-08T19:00:00.000Z'),
      entityType: 'EVENT',
      entityId: hackathonEvent.id,
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: user.id,
        title: '🎉 Milestone Achieved',
        message: 'Completed Advanced System Design & Distributed Systems milestone!',
        type: 'MILESTONE_ACHIEVED',
        isRead: false,
      },
      {
        userId: user.id,
        title: '🔥 7-Day Habit Streak',
        message: 'You have maintained your 7-day streak for Practice DSA & System Architecture.',
        type: 'HABIT_STREAK',
        isRead: true,
      },
      {
        userId: user.id,
        title: '🎪 Event Reminder',
        message: 'Global AI Agent Hackathon 2026 is scheduled for Sept 15.',
        type: 'EVENT_ALERT',
        isRead: false,
      },
    ],
  });

  console.log('✅ NOX Database Seeding Complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
