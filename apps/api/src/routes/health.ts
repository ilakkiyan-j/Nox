import { Router, Request, Response } from 'express';
import { db } from '@nox/database';
import { apiResponse, apiError } from '../middleware/error';

const router = Router();

router.get('/health', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    await db.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - startTime;

    return apiResponse(res, {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        latencyMs: dbLatency,
      },
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (err: any) {
    return apiError(res, `Health check failure: ${err.message}`, 503, {
      database: { connected: false },
    });
  }
});

export default router;
