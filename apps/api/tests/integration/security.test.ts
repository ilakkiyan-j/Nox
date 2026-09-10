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

const PASSWORD = 'password123';
const app = createApp();

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-that-is-longer-than-32-characters-long';
  process.env.NODE_ENV = 'test';
});

beforeEach(async () => {
  fakeDb.reset();
});

async function seedUsers() {
  const hash = bcrypt.hashSync(PASSWORD, 10);
  const user = await fakeDb.seedUser({ email: 'user@nox.test', password: hash });
  const other = await fakeDb.seedUser({ email: 'other@nox.test', password: hash });
  const admin = await fakeDb.seedAdmin({ email: 'admin@nox.test', password: hash });
  return { user, other, admin };
}

async function login(email: string) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: PASSWORD });
  return res;
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe('Authentication', () => {
  test('requires email and password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'a@b.co' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rejects invalid credentials', async () => {
    await seedUsers();
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'user@nox.test', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  test('returns token + sanitized user on success', async () => {
    await seedUsers();
    const res = await login('user@nox.test');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.token).toBe('string');
    expect(res.body.data.user.email).toBe('user@nox.test');
    expect(res.body.data.user.password).toBeUndefined();
  });

  test('migrates legacy plaintext passwords on login', async () => {
    fakeDb.seedUser({ email: 'legacy@nox.test', password: 'legacy-plain-pass' });
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'legacy@nox.test', password: 'legacy-plain-pass' });
    expect(res.status).toBe(200);
    const stored = (await fakeDb.user.findUnique({ where: { email: 'legacy@nox.test' } })).password;
    expect(stored.startsWith('$2')).toBe(true);
  });

  test('auth/me requires a valid token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  test('auth/me returns the current user', async () => {
    const { user } = await seedUsers();
    const token = (await login('user@nox.test')).body.data.token;
    const res = await request(app).get('/api/v1/auth/me').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(user.id);
    expect(res.body.data.password).toBeUndefined();
  });

  test('rejects forged / tampered tokens', async () => {
    await seedUsers();
    const token = (await login('user@nox.test')).body.data.token;
    const forged = token.slice(0, -4) + 'AAAA';
    const res = await request(app).get('/api/v1/auth/me').set(authHeader(forged));
    expect(res.status).toBe(401);
  });

  test('rejects tokens signed with a different secret', async () => {
    await seedUsers();
    const jwt = require('jsonwebtoken');
    const forged = jwt.sign({ sub: 'whatever', role: 'USER' }, 'attacker-secret-that-is-at-least-32-characters-long');
    const res = await request(app).get('/api/v1/auth/me').set(authHeader(forged));
    expect(res.status).toBe(401);
  });
});

describe('Authorization', () => {
  test('protected endpoints return 401 without a token', async () => {
    for (const path of ['/api/v1/goals', '/api/v1/tasks', '/api/v1/notes', '/api/v1/events', '/api/v1/habits', '/api/v1/time', '/api/v1/search?q=x']) {
      const res = await request(app).get(path);
      expect(res.status).toBe(401);
    }
  });

  test('a user cannot read another users goals via direct id mutation (IDOR)', async () => {
    const { user, other } = await seedUsers();
    const otherGoal = await fakeDb.seedGoal(other.id);
    const myToken = (await login(user.email)).body.data.token;

    const res = await request(app)
      .patch(`/api/v1/goals/${otherGoal.id}`)
      .set(authHeader(myToken))
      .send({ title: 'Hijacked' });
    expect(res.status).toBe(404);
  });

  test('a user cannot delete another users tasks', async () => {
    const { user, other } = await seedUsers();
    const otherTask = await fakeDb.task.create({
      data: { userId: other.id, title: 'Their task', status: 'TODO' },
    });
    const myToken = (await login(user.email)).body.data.token;
    const res = await request(app).delete(`/api/v1/tasks/${otherTask.id}`).set(authHeader(myToken));
    expect(res.status).toBe(404);
  });

  test('a user can mutate their own resources', async () => {
    const { user } = await seedUsers();
    const myGoal = await fakeDb.seedGoal(user.id, { title: 'Original' });
    const myToken = (await login(user.email)).body.data.token;
    const res = await request(app)
      .patch(`/api/v1/goals/${myGoal.id}`)
      .set(authHeader(myToken))
      .send({ title: 'Updated by owner' });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated by owner');
  });

  test('creating a goal scopes it to the authenticated user', async () => {
    const { user } = await seedUsers();
    const myToken = (await login(user.email)).body.data.token;
    const res = await request(app)
      .post('/api/v1/goals')
      .set(authHeader(myToken))
      .send({ title: 'My Goal' });
    expect(res.status).toBe(201);
    expect(res.body.data.userId).toBe(user.id);
  });
});

describe('Admin authorization', () => {
  test('regular users cannot access admin endpoints', async () => {
    const { user } = await seedUsers();
    const token = (await login(user.email)).body.data.token;
    const res = await request(app).get('/api/v1/admin/users').set(authHeader(token));
    expect(res.status).toBe(403);
  });

  test('admin cannot be impersonated from a regular user token', async () => {
    const { user } = await seedUsers();
    const token = (await login(user.email)).body.data.token;
    const res = await request(app).delete('/api/v1/admin/users/some-id').set(authHeader(token));
    expect(res.status).toBe(403);
  });

  test('admin can list users without password exposure', async () => {
    const { admin } = await seedUsers();
    const token = (await login(admin.email)).body.data.token;
    const res = await request(app).get('/api/v1/admin/users').set(authHeader(token));
    expect(res.status).toBe(200);
    for (const u of res.body.data) {
      expect(u.password).toBeUndefined();
    }
  });

  test('admin can create a user', async () => {
    const { admin } = await seedUsers();
    const token = (await login(admin.email)).body.data.token;
    const res = await request(app)
      .post('/api/v1/admin/users')
      .set(authHeader(token))
      .send({ name: 'New Person', email: 'new@nox.test', password: 'newpassword123' });
    expect(res.status).toBe(201);
    expect(res.body.data.password).toBeUndefined();
  });

  test('admin create rejects weak passwords', async () => {
    const { admin } = await seedUsers();
    const token = (await login(admin.email)).body.data.token;
    const res = await request(app)
      .post('/api/v1/admin/users')
      .set(authHeader(token))
      .send({ name: 'Weak', email: 'weak@nox.test', password: 'tiny' });
    expect(res.status).toBe(400);
  });
});

describe('Input validation & security', () => {
  test('rejects malformed JSON bodies', async () => {
    await seedUsers();
    const token = (await login('user@nox.test')).body.data.token;
    const res = await request(app).post('/api/v1/notes').set(authHeader(token)).set('Content-Type', 'application/json').send('{not json');
    expect(res.status).toBe(400);
  });

  test('rejects unsafe javascript: URLs when creating notes', async () => {
    const { user } = await seedUsers();
    const token = (await login(user.email)).body.data.token;
    const res = await request(app)
      .post('/api/v1/notes')
      .set(authHeader(token))
      .send({ title: 'Phish', url: 'javascript:alert(document.cookie)', content: 'x' });
    expect(res.status).toBe(400);
  });

  test('rejects unsafe data: URLs when creating events', async () => {
    const { user } = await seedUsers();
    const token = (await login(user.email)).body.data.token;
    const res = await request(app)
      .post('/api/v1/events')
      .set(authHeader(token))
      .send({ title: 'Event', url: 'data:text/html,<script>evil()</script>', date: '2026-12-01' });
    expect(res.status).toBe(400);
  });

  test('roadmap import rejects invalid structure without creating data', async () => {
    const { user } = await seedUsers();
    const token = (await login(user.email)).body.data.token;
    const res = await request(app)
      .post('/api/v1/roadmaps/import')
      .set(authHeader(token))
      .send({ title: 'Bad Plan', milestones: [{ description: 'no title' }] });
    expect(res.status).toBe(400);
    expect(fakeDb.store.roadmap ?? []).toHaveLength(0);
  });

  test('roadmap import rejects duplicate titles and oversized payloads', async () => {
    const { user } = await seedUsers();
    const token = (await login(user.email)).body.data.token;
    const dup = await request(app)
      .post('/api/v1/roadmaps/import')
      .set(authHeader(token))
      .send({ title: 'Dup', milestones: [{ title: 'A' }, { title: 'A' }] });
    expect(dup.status).toBe(400);

    const big = await request(app)
      .post('/api/v1/roadmaps/import')
      .set(authHeader(token))
      .send({ title: 'Big', milestones: Array.from({ length: 51 }, (_, i) => ({ title: `M${i}` })) });
    expect(big.status).toBe(400);
  });

  test('roadmap import succeeds for a valid plan and stores related records in a transaction', async () => {
    const { user } = await seedUsers();
    const token = (await login(user.email)).body.data.token;
    const goal = await fakeDb.seedGoal(user.id);
    const res = await request(app)
      .post('/api/v1/roadmaps/import')
      .set(authHeader(token))
      .send({
        goalId: goal.id,
        title: 'Valid Plan',
        milestones: [
          { title: 'Phase 1', tasks: [{ title: 'Task 1', priority: 'HIGH' }] },
          { title: 'Phase 2', tasks: [{ title: 'Task 2' }] },
        ],
      });
    expect(res.status).toBe(201);
    expect(fakeDb.store.roadmap).toHaveLength(1);
    expect(fakeDb.store.milestone).toHaveLength(2);
    expect(fakeDb.store.task).toHaveLength(2);
    const tasks = fakeDb.store.task!;
    expect(tasks.every((t: any) => t.userId === user.id)).toBe(true);
    expect((res.body.data.milestones ?? []).length).toBe(2);
  });

  test('roadmap import rejects referencing another users goal', async () => {
    const { user, other } = await seedUsers();
    const token = (await login(user.email)).body.data.token;
    const otherGoal = await fakeDb.seedGoal(other.id);
    const res = await request(app)
      .post('/api/v1/roadmaps/import')
      .set(authHeader(token))
      .send({ goalId: otherGoal.id, title: 'Sneaky', milestones: [{ title: 'Phase 1' }] });
    expect(res.status).toBe(404);
  });

  test('unknown routes return structured 404', async () => {
    await seedUsers();
    const token = (await login('user@nox.test')).body.data.token;
    const res = await request(app).get('/api/v1/does-not-exist').set(authHeader(token));
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});