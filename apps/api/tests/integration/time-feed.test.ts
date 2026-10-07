import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../src/app';

jest.mock('@nox/database', () => {
  const { FakeDb } = require('../helpers/fake-db');
  const fake = new FakeDb();
  return { db: fake, __fakeDb: fake };
});

const mock = jest.requireMock('@nox/database') as any;
const fakeDb: InstanceType<typeof import('../helpers/fake-db')['FakeDb']> = mock.__fakeDb;
const app = createApp();

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-that-is-longer-than-32-characters-long';
  process.env.NODE_ENV = 'test';
});

beforeEach(() => {
  fakeDb.reset();
  jest.useFakeTimers().setSystemTime(new Date('2026-10-08T10:00:00.000Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Time feed reminders', () => {
  test('includes recent overdue reminders without letting them displace today reminders', async () => {
    const user = await fakeDb.seedUser({
      email: 'time-feed@nox.test',
      password: bcrypt.hashSync('password123', 10),
    });
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'password123' });
    const token = login.body.data.token as string;

    const oldOverdue = new Date('2026-10-04T12:00:00.000Z');
    for (let index = 0; index < 12; index += 1) {
      await fakeDb.reminder.create({
        data: {
          userId: user.id,
          title: `Old overdue ${index}`,
          remindAt: oldOverdue,
          isCompleted: false,
        },
      });
    }
    const recentOverdue = await fakeDb.reminder.create({
      data: {
        userId: user.id,
        title: 'Recent overdue',
        remindAt: new Date('2026-10-07T10:00:00.000Z'),
        isCompleted: false,
      },
    });
    const todayReminder = await fakeDb.reminder.create({
      data: {
        userId: user.id,
        title: 'Today reminder',
        remindAt: new Date('2026-10-08T18:00:00.000Z'),
        isCompleted: false,
      },
    });

    const response = await request(app)
      .get('/api/v1/time?timeZone=Asia%2FKolkata')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    const nowItems = response.body.data.now as Array<{ id: string; label: string }>;
    const nextItems = response.body.data.next as Array<{ id: string }>;
    expect(nowItems.some((item) => item.id === recentOverdue.id && item.label === 'Overdue')).toBe(true);
    expect(nextItems.some((item) => item.id === todayReminder.id)).toBe(true);
    expect(nowItems.filter((item) => item.label === 'Overdue')).toHaveLength(10);
  });

  test('groups date-only task deadlines by the requester timezone instead of server date', async () => {
    jest.setSystemTime(new Date('2026-10-08T02:00:00.000Z'));
    const user = await fakeDb.seedUser({
      email: 'time-zone-tasks@nox.test',
      password: bcrypt.hashSync('password123', 10),
    });
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'password123' });
    const token = login.body.data.token as string;

    const dueToday = await fakeDb.task.create({
      data: {
        userId: user.id,
        title: 'Los Angeles today',
        status: 'TODO',
        dueDate: new Date('2026-10-07T00:00:00.000Z'),
      },
    });
    const overdue = await fakeDb.task.create({
      data: {
        userId: user.id,
        title: 'Los Angeles overdue',
        status: 'TODO',
        dueDate: new Date('2026-10-06T00:00:00.000Z'),
      },
    });

    const response = await request(app)
      .get('/api/v1/time?timeZone=America%2FLos_Angeles')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    const nowItems = response.body.data.now as Array<{ id: string; label: string }>;
    const nextItems = response.body.data.next as Array<{ id: string; label: string }>;
    expect(nowItems.some((item) => item.id === overdue.id && item.label === 'Overdue')).toBe(true);
    expect(nextItems.some((item) => item.id === dueToday.id && item.label === 'Today')).toBe(true);
  });
});
