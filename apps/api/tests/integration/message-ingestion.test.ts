import { createHmac } from 'crypto';
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
const jwtSecret = 'test-secret-that-is-longer-than-32-characters-long';

beforeAll(() => {
  process.env.JWT_SECRET = jwtSecret;
  process.env.NODE_ENV = 'test';
});

beforeEach(() => {
  fakeDb.reset();
});

async function createUser(email: string) {
  return fakeDb.seedUser({
    email,
    password: bcrypt.hashSync('password123', 10),
  });
}

async function login(email: string): Promise<string> {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: 'password123' });
  return response.body.data.token as string;
}

function telegramSecret(userId: string): string {
  return createHmac('sha256', jwtSecret).update(`telegram-webhook:${userId}`).digest('base64url');
}

describe('Message ingestion ownership', () => {
  test('requires authentication for shortcut/webhook ingestion', async () => {
    const user = await createUser('messages@nox.test');

    const response = await request(app)
      .post('/api/v1/messages/webhook')
      .send({ content: 'unauthorized message', userId: user.id });

    expect(response.status).toBe(401);
    expect(fakeDb.store.message || []).toHaveLength(0);
  });

  test('scopes shortcut/webhook ingestion to the authenticated user', async () => {
    const user = await createUser('owner@nox.test');
    const otherUser = await createUser('other@nox.test');
    const token = await login(user.email);

    const response = await request(app)
      .post('/api/v1/messages/webhook')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'owned by requester', userId: otherUser.id });

    expect(response.status).toBe(201);
    expect(response.body.data.userId).toBe(user.id);
    expect(fakeDb.store.message).toHaveLength(1);
    expect(fakeDb.store.message[0].userId).toBe(user.id);
  });

  test('rejects Telegram updates without the owner-specific secret', async () => {
    const user = await createUser('telegram@nox.test');

    const response = await request(app)
      .post(`/api/v1/messages/telegram?mode=forwarder&userId=${encodeURIComponent(user.id)}`)
      .send({ message: { text: 'untrusted update', chat: { id: 123 } } });

    expect(response.status).toBe(401);
    expect(fakeDb.store.message || []).toHaveLength(0);
  });

  test('accepts a correctly signed Telegram update and scopes it to the signed owner', async () => {
    const user = await createUser('telegram-owner@nox.test');
    const otherUser = await createUser('telegram-other@nox.test');
    const originalTelegramToken = process.env.TELEGRAM_BOT_TOKEN;
    process.env.TELEGRAM_BOT_TOKEN = '';
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          telegramWebhookUrl: `https://nox.example/api/v1/messages/telegram?mode=forwarder&userId=${encodeURIComponent(user.id)}`,
        },
      }),
    } as Response);

    try {
      const response = await request(app)
        .post(`/api/v1/messages/telegram?mode=forwarder&userId=${encodeURIComponent(user.id)}`)
        .set('x-telegram-bot-api-secret-token', telegramSecret(user.id))
        .send({
          message: {
            text: 'signed inbox message',
            chat: { id: 123 },
            from: { first_name: 'Tester' },
          },
        });

      expect(response.status).toBe(200);
      expect(fakeDb.store.message).toHaveLength(1);
      expect(fakeDb.store.message[0].userId).toBe(user.id);
      expect(fakeDb.store.message[0].userId).not.toBe(otherUser.id);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    } finally {
      fetchSpy.mockRestore();
      if (originalTelegramToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
      else process.env.TELEGRAM_BOT_TOKEN = originalTelegramToken;
    }
  });

  test('acknowledges but does not ingest signed updates for a disconnected forwarder', async () => {
    const user = await createUser('disconnected@nox.test');
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: { message: 'Bot not found' } }),
    } as Response);

    try {
      const response = await request(app)
        .post(`/api/v1/messages/telegram?mode=forwarder&userId=${encodeURIComponent(user.id)}`)
        .set('x-telegram-bot-api-secret-token', telegramSecret(user.id))
        .send({
          message: {
            text: 'message after disconnect',
            chat: { id: 123 },
            from: { first_name: 'Tester' },
          },
        });

      expect(response.status).toBe(200);
      expect(fakeDb.store.message || []).toHaveLength(0);
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
