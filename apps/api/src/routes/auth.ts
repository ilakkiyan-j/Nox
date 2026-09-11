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

privateRouter.patch('/auth/profile', async (req: Request, res: Response) => {
  try {
    const { name, headline, avatarUrl } = (req.body ?? {}) as { name?: unknown; headline?: unknown; avatarUrl?: unknown };
    const data: Record<string, any> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) return apiError(res, 'Name must be a non-empty string');
      data.name = name.trim().slice(0, 100);
    }
    if (headline !== undefined) {
      data.headline = typeof headline === 'string' && headline.trim() ? headline.trim().slice(0, 200) : null;
    }
    if (avatarUrl !== undefined) {
      data.avatarUrl = typeof avatarUrl === 'string' && avatarUrl.trim() ? avatarUrl.trim() : null;
    }

    const updated = await db.user.update({
      where: { id: req.user!.id },
      data,
    });

    return apiResponse(res, sanitizeUser(updated), 200, 'Profile updated successfully');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update profile';
    return apiError(res, message, 500);
  }
});

privateRouter.post('/auth/avatar/upload', async (req: Request, res: Response) => {
  try {
    const { image } = (req.body ?? {}) as { image?: unknown };
    if (typeof image !== 'string' || !image.trim()) {
      return apiError(res, 'Image payload is required');
    }

    const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const cloudinaryPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
    const imgbbKey = process.env.IMGBB_API_KEY;

    // 1. Cloudinary upload if CLOUDINARY_CLOUD_NAME & CLOUDINARY_UPLOAD_PRESET are set
    if (cloudinaryCloudName && cloudinaryPreset) {
      const formData = new URLSearchParams();
      formData.append('file', image.trim());
      formData.append('upload_preset', cloudinaryPreset);

      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const cloudData = (await cloudRes.json()) as any;

      if (cloudData && cloudData.secure_url) {
        const cdnUrl = cloudData.secure_url as string;
        const updatedUser = await db.user.update({
          where: { id: req.user!.id },
          data: { avatarUrl: cdnUrl },
        });
        return apiResponse(res, { url: cdnUrl, user: sanitizeUser(updatedUser) }, 200, 'Avatar uploaded to Cloudinary CDN successfully');
      }
    }

    // 2. ImgBB upload if IMGBB_API_KEY is set
    if (imgbbKey) {
      const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, '');
      const formData = new URLSearchParams();
      formData.append('image', cleanBase64);

      const cloudRes = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
        method: 'POST',
        body: formData,
      });
      const cloudData = (await cloudRes.json()) as any;

      if (cloudData && cloudData.success && cloudData.data?.url) {
        const cdnUrl = (cloudData.data.display_url || cloudData.data.url) as string;
        const updatedUser = await db.user.update({
          where: { id: req.user!.id },
          data: { avatarUrl: cdnUrl },
        });
        return apiResponse(res, { url: cdnUrl, user: sanitizeUser(updatedUser) }, 200, 'Avatar uploaded to Cloud CDN successfully');
      }
    }

    // 3. Fallback: Save optimized base64 data URL directly if no cloud environment key is configured
    const updatedUser = await db.user.update({
      where: { id: req.user!.id },
      data: { avatarUrl: image.trim() },
    });
    return apiResponse(res, { url: image.trim(), user: sanitizeUser(updatedUser) }, 200, 'Avatar saved successfully');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Avatar upload failed';
    return apiError(res, message, 500);
  }
});

export { publicRouter as authPublicRouter, privateRouter as authPrivateRouter };
export default publicRouter;