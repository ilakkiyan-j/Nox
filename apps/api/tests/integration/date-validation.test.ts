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
const password = 'password123';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-that-is-longer-than-32-characters-long';
  process.env.NODE_ENV = 'test';
});

beforeEach(() => {
  fakeDb.reset();
});

async function authenticate() {
  const user = await fakeDb.seedUser({
    email: 'dates@nox.test',
    password: bcrypt.hashSync(password, 10),
  });
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: user.email, password });
  return {
    token: response.body.data.token as string,
    user,
  };
}

describe('Calendar date validation', () => {
  test('rejects an invalid task date instead of silently clearing it', async () => {
    const { token } = await authenticate();

    const response = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Review roadmap', dueDate: 'not-a-date' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(fakeDb.store.task || []).toHaveLength(0);
  });

  test('rejects an impossible task calendar day', async () => {
    const { token } = await authenticate();

    const response = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Review roadmap', dueDate: '2026-02-30' });

    expect(response.status).toBe(400);
    expect(fakeDb.store.task || []).toHaveLength(0);
  });

  test('rejects an impossible calendar day in an ISO task timestamp', async () => {
    const { token } = await authenticate();

    const response = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Review roadmap', dueDate: '2026-02-30T09:00:00.000Z' });

    expect(response.status).toBe(400);
    expect(fakeDb.store.task || []).toHaveLength(0);
  });

  test('rejects an invalid habit log date instead of logging today', async () => {
    const { token, user } = await authenticate();
    const habit = await fakeDb.habit.create({
      data: { userId: user.id, title: 'Read' },
    });

    const response = await request(app)
      .post(`/api/v1/habits/${habit.id}/log`)
      .set('Authorization', `Bearer ${token}`)
      .send({ date: 'not-a-date', status: 'COMPLETED' });

    expect(response.status).toBe(400);
    expect(fakeDb.store.habitLog || []).toHaveLength(0);
  });

  test('rejects an impossible calendar day in an ISO habit log timestamp', async () => {
    const { token, user } = await authenticate();
    const habit = await fakeDb.habit.create({
      data: { userId: user.id, title: 'Read' },
    });

    const response = await request(app)
      .post(`/api/v1/habits/${habit.id}/log`)
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-02-30T09:00:00.000Z', status: 'COMPLETED' });

    expect(response.status).toBe(400);
    expect(fakeDb.store.habitLog || []).toHaveLength(0);
  });

  test('rejects an invalid event date instead of using the current date', async () => {
    const { token } = await authenticate();

    const response = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Planning', date: 'not-a-date' });

    expect(response.status).toBe(400);
    expect(fakeDb.store.event || []).toHaveLength(0);
  });

  test('rejects an event whose end date is before its start date', async () => {
    const { token } = await authenticate();

    const response = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Planning', date: '2026-10-08', endDate: '2026-10-07' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/end date cannot be before/i);
    expect(fakeDb.store.event || []).toHaveLength(0);
  });

  test('rejects updating an event to end before its existing start date', async () => {
    const { token, user } = await authenticate();
    const event = await fakeDb.event.create({
      data: {
        userId: user.id,
        title: 'Planning',
        date: new Date('2026-10-08T00:00:00.000Z'),
        endDate: null,
      },
    });

    const response = await request(app)
      .patch(`/api/v1/events/${event.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ endDate: '2026-10-07' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/end date cannot be before/i);
    expect(fakeDb.store.event?.[0].endDate).toBeNull();
  });

  test('rejects an invalid goal target date instead of silently clearing it', async () => {
    const { token } = await authenticate();

    const response = await request(app)
      .post('/api/v1/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Ship Nox', targetDate: 'not-a-date' });

    expect(response.status).toBe(400);
    expect(fakeDb.store.goal || []).toHaveLength(0);
  });

  test('rejects an invalid reminder date instead of scheduling it immediately', async () => {
    const { token } = await authenticate();

    const response = await request(app)
      .post('/api/v1/reminders')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Review plan', remindAt: 'not-a-date' });

    expect(response.status).toBe(400);
    expect(fakeDb.store.reminder || []).toHaveLength(0);
  });

  test.each(['/api/v1/dashboard', '/api/v1/time'])(
    'rejects an invalid client timezone for %s',
    async (path) => {
      const { token } = await authenticate();

      const response = await request(app)
        .get(`${path}?timeZone=Not%2FAZone`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toMatch(/IANA time zone/);
    },
  );
});
