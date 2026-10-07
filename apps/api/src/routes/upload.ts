import { Router, Request, Response } from 'express';
import { apiError, apiResponse } from '../lib/http';

export const uploadRouter = Router();

/**
 * POST /api/v1/upload/image
 * Generic authenticated image upload endpoint for bot avatars, assets, and attachments.
 * Uploads to ImgBB CDN if IMGBB_API_KEY is configured in .env, or returns optimized base64 payload.
 * Crucial: Does NOT modify user profile avatar.
 */
uploadRouter.post('/upload/image', async (req: Request, res: Response) => {
  try {
    const { image } = (req.body ?? {}) as { image?: unknown };
    if (typeof image !== 'string' || !image.trim()) {
      return apiError(res, 'Image payload is required');
    }

    const imgbbKey = process.env.IMGBB_API_KEY;

    // 1. Upload to ImgBB Cloud CDN if configured
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
        return apiResponse(res, { url: cdnUrl }, 200, 'Image uploaded to CDN successfully');
      }
    }

    // 2. Return payload directly if external CDN is not configured
    return apiResponse(res, { url: image.trim() }, 200, 'Image processed successfully');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to upload image';
    return apiError(res, message, 500);
  }
});

export default uploadRouter;
