import 'dotenv/config';
import request from 'supertest';
import express from 'express';
import healthRouter from '../../src/routes/health';

const app = express();
app.use(express.json());
app.use('/api/v1', healthRouter);

describe('GET /api/v1/health API Integration Tests', () => {
  test('should return 200 OK and healthy status structure', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.database.connected).toBe(true);
    expect(typeof res.body.data.uptime).toBe('number');
  });
});
