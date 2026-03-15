/**
 * @what - GCS image storage for session avatars and scene images
 * @why - Images were in-memory or ephemeral disk only. Server restart = all lost.
 *   GCS provides durable storage with public URLs for summary/share card display.
 * @exports - uploadSessionImage, getPublicUrl, GCS_BUCKET
 */

import { Storage } from '@google-cloud/storage';
import { logger } from './logger.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const GCS_BUCKET = process.env['GCS_IMAGE_BUCKET'] ?? 'past-live-images';

// ─── Singleton ────────────────────────────────────────────────────────────────

let _storage: Storage | null = null;

function getStorage(): Storage {
  if (!_storage) {
    _storage = new Storage({
      projectId: process.env['GOOGLE_CLOUD_PROJECT'],
    });
  }
  return _storage;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ImageType = 'avatar' | 'scene' | 'scene_preview';

interface UploadResult {
  /** Public URL to the stored image. */
  url: string;
  /** GCS object path (bucket-relative). */
  path: string;
}

// ─── Upload ───────────────────────────────────────────────────────────────────

/**
 * Uploads a base64-encoded image to GCS. Fire-and-forget safe.
 * Returns the public URL on success, or null on failure.
 *
 * Path format: `sessions/{sessionId}/{type}/{timestamp}.png`
 *
 * @pitfall - Uses `makePublic()` for simplicity. Bucket must have
 *   uniform bucket-level access disabled, or use allUsers IAM.
 */
export async function uploadSessionImage(
  sessionId: string,
  imageType: ImageType,
  base64Data: string,
  metadata?: { title?: string },
): Promise<UploadResult | null> {
  const startMs = Date.now();
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const objectPath = `sessions/${sessionId}/${imageType}/${ts}.png`;

  try {
    const bucket = getStorage().bucket(GCS_BUCKET);
    const file = bucket.file(objectPath);

    const buffer = Buffer.from(base64Data, 'base64');

    await file.save(buffer, {
      contentType: 'image/png',
      metadata: {
        sessionId,
        imageType,
        ...(metadata?.title ? { sceneTitle: metadata.title } : {}),
      },
      public: true,
    });

    const url = `https://storage.googleapis.com/${GCS_BUCKET}/${objectPath}`;
    const durationMs = Date.now() - startMs;

    logger.info(
      { event: 'gcs_upload_success', objectPath, imageType, sessionId, durationMs, sizeBytes: buffer.length },
      `Image uploaded to GCS: ${objectPath} (${(durationMs / 1000).toFixed(1)}s)`,
    );

    return { url, path: objectPath };
  } catch (err) {
    logger.warn(
      { event: 'gcs_upload_failed', objectPath, imageType, sessionId, err, durationMs: Date.now() - startMs },
      `Failed to upload image to GCS: ${objectPath}`,
    );
    return null;
  }
}

/**
 * Constructs the public URL for a GCS object.
 * Does NOT verify the object exists.
 */
export function getPublicUrl(objectPath: string): string {
  return `https://storage.googleapis.com/${GCS_BUCKET}/${objectPath}`;
}
