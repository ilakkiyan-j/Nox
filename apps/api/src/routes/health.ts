import { Router, Request, Response } from 'express';
import { db } from '@nox/database';
import { apiResponse, apiError } from '../middleware/error';

const router = Router();

router.get('/health', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    let dbConnected = true;
    let dbLatency = 0;

    try {
      await db.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - startTime;
    } catch (dbErr) {
      dbConnected = false;
    }

    return apiResponse(res, {
      status: dbConnected ? 'healthy' : 'degraded',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: {
        connected: dbConnected,
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
