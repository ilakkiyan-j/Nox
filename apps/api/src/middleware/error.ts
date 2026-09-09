import { Request, Response, NextFunction } from 'express';

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    statusCode: number;
    details?: any;
  };
}

export function apiResponse<T>(res: Response, data: T, status = 200, message?: string) {
  return res.status(status).json({
    success: true,
    data,
    message,
  });
}

export function apiError(res: Response, message: string, status = 400, details?: any) {
  return res.status(status).json({
    success: false,
    error: {
      message,
      statusCode: status,
      details,
    },
  });
}

export function globalErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(`[API Error] ${req.method} ${req.url}:`, err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'An unexpected internal server error occurred.';

  return apiError(res, message, statusCode, process.env.NODE_ENV === 'development' ? err.stack : undefined);
}
