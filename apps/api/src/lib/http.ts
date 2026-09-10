import { Response } from 'express';

export function apiResponse<T>(res: Response, data: T, status = 200, message?: string) {
  return res.status(status).json({
    success: true,
    data,
    message,
  });
}

export function apiError(res: Response, message: string, status = 400, details?: unknown) {
  return res.status(status).json({
    success: false,
    error: {
      message,
      statusCode: status,
      details,
    },
  });
}

export class HttpError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.details = details;
  }
}