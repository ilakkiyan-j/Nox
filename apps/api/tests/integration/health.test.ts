import 'dotenv/config';
import request from 'supertest';
import express from 'express';
import healthRouter from '../../src/routes/health';

const app = express();
app.use(express.json());
app.use('/api/v1', healthRouter);

describe('GET /api/v1/health API Integration Tests', () => {
  test('should return 200 OK and health status structure', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(['healthy', 'degraded']).toContain(res.body.data.status);
    expect(typeof res.body.data.database.connected).toBe('boolean');
    expect(typeof res.body.data.uptime).toBe('number');
  });
});
