import { Request, Response, NextFunction } from 'express';
import { db } from '@nox/database';
import { verifyToken, JwtClaims } from '../lib/auth';
import { apiError } from '../lib/http';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        name: string;
      };
    }
  }
}

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token || token.trim().length === 0) return null;
  return token.trim();
}

/**
 * Authenticates requests via `Authorization: Bearer <jwt>`.
 * Verifies the token is signed by us and resolves the user from the DB so
 * revoked/deleted accounts immediately lose access.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) {
    return apiError(res, 'Authentication required. Please sign in.', 401);
  }

  try {
    const claims: JwtClaims = verifyToken(token);
    const user = await db.user.findUnique({
      where: { id: claims.sub },
      select: { id: true, role: true, name: true, email: true },
    });
    if (!user) {
      return apiError(res, 'Session user no longer exists. Please sign in again.', 401);
    }
    req.user = { id: user.id, role: user.role, name: user.name };
    return next();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid session';
    return apiError(res, message, 401);
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return apiError(res, 'Administrator access required.', 403);
  }
  return next();
}