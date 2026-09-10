import { Request, Response, NextFunction } from 'express';
import { apiError } from '../lib/http';

export { apiResponse, apiError } from '../lib/http';

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    statusCode: number;
    details?: any;
  };
}

export function globalErrorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  // Log full error in development, minimal detail in production, silence in tests.
  if (process.env.NODE_ENV === 'test') {
    // no-op
  } else if (process.env.NODE_ENV !== 'production') {
    console.error(`[API Error] ${req.method} ${req.originalUrl}:`, err);
  } else {
    console.error(`[API Error] ${req.method} ${req.originalUrl}: ${err?.message || 'Unknown error'}`);
  }

  if (err?.type === 'entity.parse.failed') {
    return apiError(res, 'Malformed JSON body', 400);
  }
  if (err?.type === 'entity.too.large') {
    return apiError(res, 'Request payload too large', 413);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'An unexpected internal server error occurred.';

  // Never leak stack traces or internals to clients in production.
  return apiError(res, message, statusCode, process.env.NODE_ENV === 'development' ? err.stack : undefined);
}