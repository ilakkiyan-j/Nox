import { Router, Request, Response } from 'express';
import { db } from '@nox/database';
import { apiError, apiResponse } from '../lib/http';
import { hashPassword, sanitizeUser, signToken, verifyPassword } from '../lib/auth';

const publicRouter = Router();
const privateRouter = Router();

function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && email.trim().length > 3 && email.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

publicRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = (req.body ?? {}) as { email?: unknown; password?: unknown };

    if (!isValidEmail(email) || typeof password !== 'string' || password.length === 0) {
      return apiError(res, 'Email and password are required');
    }
    if (password.length > 200) {
      return apiError(res, 'Invalid credentials. Please check your email and password.', 401);
    }

    const user = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    // Load hash; legacy plaintext passwords are migrated lazily on login.
    const stored = user ? user.password : '';
    const isLegacyPlaintext = stored.length > 0 && !stored.startsWith('$2');
    const valid =
      user &&
      (await (isLegacyPlaintext
        ? stored === password
        : verifyPassword(password, stored)));

    if (!user || !valid) {
      return apiError(res, 'Invalid credentials. Please check your email and password.', 401);
    }

    if (isLegacyPlaintext) {
      const hashed = await hashPassword(password);
      await db.user.update({ where: { id: user.id }, data: { password: hashed } });
    }

    const token = signToken(user);
    return apiResponse(res, { token, user: sanitizeUser(user) }, 200, 'Authentication successful');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Authentication failed';
    return apiError(res, message, 500);
  }
});

privateRouter.get('/auth/me', async (req: Request, res: Response) => {
  try {
    const user = await db.user.findUnique({
      where: { id: req.user!.id },
    });
    if (!user) return apiError(res, 'No user found', 404);
    return apiResponse(res, sanitizeUser(user));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load user';
    return apiError(res, message, 500);
  }
});

export { publicRouter as authPublicRouter, privateRouter as authPrivateRouter };
export default publicRouter;