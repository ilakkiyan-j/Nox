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

function councilResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

async function signIn() {
  await fakeDb.seedUser({
    email: 'council-user@nox.test',
    password: bcrypt.hashSync(password, 10),
  });
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'council-user@nox.test', password });
  return {
    token: response.body.data.token as string,
    userId: response.body.data.user.id as string,
  };
}

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-that-is-longer-than-32-characters-long';
  process.env.NODE_ENV = 'test';
});

beforeEach(() => {
  fakeDb.reset();
  jest.restoreAllMocks();
});

describe('Council proxy isolation and errors', () => {
  test('does not query another account when the current user has no provider credentials', async () => {
    const { token, userId } = await signIn();
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      councilResponse(200, { success: true, data: [] }),
    );

    const response = await request(app)
      .get('/api/v1/council/provider-credentials')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect((fetchSpy.mock.calls[0][1]?.headers as Record<string, string>)['X-User-Id']).toBe(userId);
  });

  test('returns an upstream failure instead of reporting an empty credential list', async () => {
    const { token } = await signIn();
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      councilResponse(503, { success: false, error: { message: 'Council unavailable' } }),
    );

    const response = await request(app)
      .get('/api/v1/council/provider-credentials')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
  });

  test('accepts a memory profile scoped to the authenticated Council user', async () => {
    const { token, userId } = await signIn();
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      councilResponse(200, { success: true, data: { userId, facts: [] } }),
    );

    const response = await request(app)
      .get('/api/v1/council/memory')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ userId, facts: [] });
  });
});
