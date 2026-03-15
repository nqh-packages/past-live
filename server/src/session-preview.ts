/**
 * @what - POST /session-preview (2-phase) + GET /story-script/:previewId
 * @why - Phase 1 returns metadata+images in ~2-3s so the preview card appears fast.
 *        Phase 2 generates storyScript in background (~5-8s) while student reads the card.
 *        Phase 3 pre-generates ALL scene images in background so show_scene is zero-latency.
 *        Preset path is untouched — presets have hardcoded storyScripts and skip Flash entirely.
 * @exports - sessionPreviewRoute, PreviewMetadata, SessionPreviewResponse, FlashResponse,
 *            getPreGeneratedScenes
 */

import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { buildSceneImagePrompt, getSceneReferenceImage } from './prompts/scene-image.js';
import { generateSceneImage } from './scene-image.js';
import { buildCharacterAvatarPrompt, getAvatarReferenceImage } from './prompts/character-avatar.js';
import { buildMetadataOnlyPrompt } from './prompts/session-metadata.js';
import { buildStoryScriptPrompt } from './prompts/story-script.js';
import { generateImage } from './image-gen.js';
import { logger } from './logger.js';
import { getAI } from './ai-client.js';
import { flashResponseSchema, storyScriptSchema } from './schemas.js';
import type { PreviewMetadata, FlashResponse, StoryScript } from './schemas.js';
import { PRESET_FALLBACKS, GENERIC_FALLBACK_METADATA } from './preset-scenarios.js';
import { randomUUID } from 'node:crypto';
import { logApiCall, completeApiCall } from './api-call-logger.js';

// Re-export so callers that import these types from this module don't break.
export type { PreviewMetadata, FlashResponse, StoryScript } from './schemas.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const FLASH_MODEL = 'gemini-3-flash-preview';
const MAX_BODY_SIZE = 2 * 1024 * 1024; // 2 MB
/** TTL for cached storyScripts — 10 minutes covers the full preview → call flow. */
const CACHE_TTL_MS = 10 * 60 * 1000;

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionPreviewRequest {
  topic?: string;
  scenarioId?: string;
}

export interface SessionPreviewResponse {
  /** Unique ID for the in-progress storyScript background job. */
  previewId: string;
  metadata: PreviewMetadata;
  /** Only present for preset scenarios — custom topics use GET /story-script/:previewId. */
  storyScript?: StoryScript;
  sceneImage: string | null;
  avatarImage: string | null;
  partial: boolean;
  /** True when storyScript is being generated in background — poll GET /story-script/:previewId. */
  storyScriptPending: boolean;
}

// ─── In-memory storyScript cache ──────────────────────────────────────────────

type CacheEntry =
  | { status: 'pending' }
  | { status: 'ready'; storyScript: StoryScript; expiresAt: number }
  | { status: 'failed'; error: string };

const storyScriptCache = new Map<string, CacheEntry>();

function pruneExpiredCache() {
  const now = Date.now();
  for (const [id, entry] of storyScriptCache) {
    if (entry.status === 'ready' && entry.expiresAt < now) {
      storyScriptCache.delete(id);
      preGeneratedScenesCache.delete(id);
    }
  }
}

// ─── Pre-generated scene images cache ─────────────────────────────────────────
// Keyed by previewId → Map<sceneTitle, base64Image>
// Populated in background after storyScript is ready. Zero-latency for show_scene.

const preGeneratedScenesCache = new Map<string, Map<string, string>>();

/**
 * Returns pre-generated scene images for a session, or null if not yet ready.
 * Called by relay.ts during handleStart to wire the cache into relay state.
 * Returns null for preset scenarios (they pre-generate their own initial scene image).
 */
export function getPreGeneratedScenes(previewId: string): Map<string, string> | null {
  return preGeneratedScenesCache.get(previewId) ?? null;
}

/**
 * Pre-generates all scene images from a storyScript in parallel.
 * Runs after storyScript is ready — does NOT block the session start.
 * Failures are logged and skipped; cache entry is still created (partial is fine).
 */
async function preGenerateScenesAsync(previewId: string, scenes: StoryScript['scenes']): Promise<void> {
  logger.info(
    { event: 'scene_pregegen_start', previewId, sceneCount: scenes.length },
    `Pre-generating ${scenes.length} scene image(s) in background`,
  );

  const results = await Promise.allSettled(
    scenes.map(async (scene) => {
      const image = await generateSceneImage(scene.description, previewId, scene.title);
      return { title: scene.title, image };
    }),
  );

  const sceneMap = new Map<string, string>();
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.image) {
      sceneMap.set(result.value.title, result.value.image);
      logger.info(
        { event: 'scene_pregenerated', previewId, title: result.value.title },
        `Scene pre-generated: "${result.value.title}"`,
      );
    } else if (result.status === 'rejected') {
      logger.warn(
        { event: 'scene_pregenerate_failed', previewId, err: result.reason },
        'Scene pre-generation failed — will fall back to on-the-fly generation',
      );
    }
  }

  preGeneratedScenesCache.set(previewId, sceneMap);
  logger.info(
    { event: 'scene_pregenerate_complete', previewId, cached: sceneMap.size, total: scenes.length },
    `Scene pre-generation complete: ${sceneMap.size}/${scenes.length} cached`,
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveEffectiveTopic(request: SessionPreviewRequest): string {
  if (request.topic) return request.topic;
  const preset = request.scenarioId ? PRESET_FALLBACKS[request.scenarioId] : undefined;
  return preset?.metadata.topic ?? 'a historical moment';
}

export async function fetchFlashResponse(topic: string): Promise<FlashResponse> {
  const startMs = Date.now();

  logger.info(
    { event: 'flash_metadata_start', model: FLASH_MODEL, topic },
    'Calling Flash for session metadata (phase 1 — metadata only)',
  );

  const apiCallIdPromise = logApiCall({ sessionId: 'preview', type: 'flash_metadata', model: FLASH_MODEL });

  const ai = getAI();
  let response: Awaited<ReturnType<typeof ai.models.generateContent>>;
  try {
    response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: [{ role: 'user', parts: [{ text: buildMetadataOnlyPrompt(topic) }] }],
      config: { temperature: 0.7 },
    });
  } catch (err) {
    void apiCallIdPromise.then((id) => completeApiCall(id, { status: 'failed', error: String(err), durationMs: Date.now() - startMs }));
    throw err;
  }

  const durationMs = Date.now() - startMs;
  void apiCallIdPromise.then((id) => completeApiCall(id, { status: 'completed', durationMs }));
  const raw = response.text?.trim() ?? '';
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');

  let rawParsed: unknown;
  try {
    rawParsed = JSON.parse(cleaned);
  } catch (err) {
    logger.error(
      {
        event: 'flash_metadata_parse_failed',
        code: 'PREVIEW_FLASH_002',
        err,
        durationMs,
        rawSnippet: cleaned.slice(0, 120),
        action: 'Flash returned non-JSON — check model temperature or prompt format',
      },
      'Flash metadata response failed JSON parse',
    );
    throw new Error(`Flash metadata malformed JSON: ${cleaned.slice(0, 120)}`);
  }

  // Validate shape — discriminated union covers ready/blocked
  const validation = flashResponseSchema.safeParse(rawParsed);
  if (!validation.success) {
    logger.error(
      {
        event: 'flash_metadata_invalid',
        code: 'PREVIEW_FLASH_003',
        errors: validation.error.flatten(),
        action: 'Flash returned invalid metadata — validate prompt schema',
      },
      'Flash metadata Zod validation failed',
    );
    throw new Error('Flash metadata validation failed');
  }

  const parsed: FlashResponse = validation.data;

  logger.info(
    { event: 'flash_metadata_success', type: parsed.type, durationMs },
    'Flash metadata response received',
  );

  return parsed;
}

/** Generates storyScript in background and stores result in the in-memory cache. */
async function generateStoryScriptAsync(previewId: string, metadata: PreviewMetadata): Promise<void> {
  const startMs = Date.now();

  logger.info(
    { event: 'story_script_start', previewId, characterName: metadata.characterName },
    'Generating storyScript (phase 2 — background)',
  );

  // Fire-and-forget: log this background Flash call
  const apiCallIdPromise = logApiCall({ sessionId: 'preview', type: 'flash_metadata', model: FLASH_MODEL });

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: [{ role: 'user', parts: [{ text: buildStoryScriptPrompt(metadata) }] }],
    });

    const raw = response.text?.trim() ?? '';
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');

    let rawParsed: unknown;
    try {
      rawParsed = JSON.parse(cleaned);
    } catch {
      throw new Error(`storyScript malformed JSON: ${cleaned.slice(0, 120)}`);
    }

    const validation = storyScriptSchema.safeParse(rawParsed);
    if (!validation.success) {
      throw new Error(`storyScript Zod validation failed`);
    }

    const durationMs = Date.now() - startMs;
    void apiCallIdPromise.then((id) => completeApiCall(id, { status: 'completed', durationMs }));
    logger.info(
      { event: 'story_script_ready', previewId, durationMs },
      'storyScript generation complete',
    );

    pruneExpiredCache();
    storyScriptCache.set(previewId, {
      status: 'ready',
      storyScript: validation.data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    // Phase 3: pre-generate all scene images in background — zero-latency show_scene
    void preGenerateScenesAsync(previewId, validation.data.scenes);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    logger.error(
      { event: 'story_script_failed', previewId, err, action: 'storyScript background generation failed' },
      'storyScript generation error',
    );
    void apiCallIdPromise.then((id) => completeApiCall(id, { status: 'failed', error: message, durationMs: Date.now() - startMs }));
    storyScriptCache.set(previewId, { status: 'failed', error: message });
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const sessionPreviewRoute = new Hono();

sessionPreviewRoute.post(
  '/session-preview',
  bodyLimit({ maxSize: MAX_BODY_SIZE, onError: (c) => c.json({ error: 'Request too large (max 2 MB)' }, 413) }),
  async (c) => {
    logger.info({ event: 'session_preview_request' }, 'POST /session-preview received');

    let body: SessionPreviewRequest;

    try {
      body = await c.req.json<SessionPreviewRequest>();
    } catch {
      logger.warn({ event: 'session_preview_bad_json', action: 'Client sent malformed JSON body' }, 'session-preview: invalid JSON body');
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const { topic, scenarioId } = body;

    if (!topic && !scenarioId) {
      logger.warn({ event: 'session_preview_missing_params', action: 'Client must provide topic or scenarioId' }, 'session-preview: missing topic and scenarioId');
      return c.json({ error: 'Provide topic or scenarioId' }, 400);
    }

    logger.info({ event: 'session_preview_params', topic, scenarioId }, 'session-preview: resolved request params');

    // ── Preset path — skip Flash entirely ────────────────────────────────────
    if (scenarioId && PRESET_FALLBACKS[scenarioId]) {
      const preset = PRESET_FALLBACKS[scenarioId];
      const previewId = randomUUID();

      logger.info(
        { event: 'session_preview_preset', scenarioId, previewId },
        'Preset scenario — returning cached data without Flash',
      );

      const [sceneResult, avatarResult] = await Promise.allSettled([
        generateImage({
          prompt: buildSceneImagePrompt(scenarioId, preset.metadata.topic, preset.metadata.historicalSetting),
          imageRole: 'scene_preview',
          aspectRatio: '16:9',
          imageSize: '1K',
          referenceImage: getSceneReferenceImage(),
          sessionId: previewId,
        }),
        generateImage({
          prompt: buildCharacterAvatarPrompt(scenarioId, preset.metadata.topic, preset.metadata.characterName),
          imageRole: 'avatar_preview',
          aspectRatio: '1:1',
          imageSize: '512',
          referenceImage: getAvatarReferenceImage(),
          sessionId: previewId,
        }),
      ]);

      const sceneImage = sceneResult.status === 'fulfilled' ? sceneResult.value : null;
      const avatarImage = avatarResult.status === 'fulfilled' ? avatarResult.value : null;

      if (sceneResult.status === 'rejected') {
        logger.error({ event: 'scene_image_failed', code: 'PREVIEW_IMAGE_001', err: sceneResult.reason }, 'Scene image failed (preset)');
      }
      if (avatarResult.status === 'rejected') {
        logger.error({ event: 'avatar_image_failed', code: 'PREVIEW_IMAGE_002', err: avatarResult.reason }, 'Avatar image failed (preset)');
      }

      // Pre-generate scene images from preset storyScript — same as custom path Phase 3
      if (preset.storyScript.scenes.length > 0) {
        void preGenerateScenesAsync(previewId, preset.storyScript.scenes);
      }

      const result: SessionPreviewResponse = {
        previewId,
        metadata: preset.metadata,
        storyScript: preset.storyScript,
        sceneImage,
        avatarImage,
        partial: sceneImage === null || avatarImage === null,
        storyScriptPending: false,
      };
      return c.json(result);
    }

    // ── Custom topic path — 2-phase ───────────────────────────────────────────

    const effectiveTopic = resolveEffectiveTopic(body);

    // Phase 1: metadata only (fast)
    let flashResponse: FlashResponse | null = null;
    let metadataFailed = false;

    try {
      flashResponse = await fetchFlashResponse(effectiveTopic);
    } catch (err) {
      metadataFailed = true;
      logger.error({ event: 'metadata_failed', code: 'PREVIEW_METADATA_001', err, topic: effectiveTopic }, 'Flash metadata call failed');
    }

    // Return blocked immediately — no images, no storyScript
    if (flashResponse && flashResponse.type === 'blocked') {
      return c.json(flashResponse);
    }

    let metadata: PreviewMetadata;

    if (flashResponse?.type === 'ready') {
      metadata = flashResponse.metadata;
    } else {
      metadata = GENERIC_FALLBACK_METADATA;
      logger.warn(
        { event: 'session_preview_fallback', metadataFailed, action: 'Flash failed — using generic fallback' },
        'session-preview: using generic fallback metadata',
      );
    }

    // Allocate previewId and mark storyScript slot as pending
    const previewId = randomUUID();
    storyScriptCache.set(previewId, { status: 'pending' });

    // Images + storyScript start in parallel; we return after images resolve.
    const [sceneResult, avatarResult] = await Promise.allSettled([
      generateImage({
        prompt: buildSceneImagePrompt(scenarioId, metadata.topic, metadata.historicalSetting),
        imageRole: 'scene_preview',
        aspectRatio: '16:9',
        imageSize: '1K',
        referenceImage: getSceneReferenceImage(),
        sessionId: previewId,
      }),
      generateImage({
        prompt: buildCharacterAvatarPrompt(scenarioId, metadata.topic, metadata.characterName),
        imageRole: 'avatar_preview',
        aspectRatio: '1:1',
        imageSize: '512',
        referenceImage: getAvatarReferenceImage(),
        sessionId: previewId,
      }),
    ]);

    // Background: do NOT await
    void generateStoryScriptAsync(previewId, metadata);

    const sceneImage = sceneResult.status === 'fulfilled' ? sceneResult.value : null;
    const avatarImage = avatarResult.status === 'fulfilled' ? avatarResult.value : null;

    if (sceneResult.status === 'rejected') {
      logger.error({ event: 'scene_image_failed', code: 'PREVIEW_IMAGE_001', err: sceneResult.reason }, 'Scene image call failed');
    }
    if (avatarResult.status === 'rejected') {
      logger.error({ event: 'avatar_image_failed', code: 'PREVIEW_IMAGE_002', err: avatarResult.reason }, 'Avatar image call failed');
    }

    logger.info(
      {
        event: 'session_preview_complete',
        previewId,
        characterName: metadata.characterName,
        partial: metadataFailed || sceneImage === null || avatarImage === null,
        storyScriptPending: true,
      },
      'session-preview phase 1 response ready — storyScript generating in background',
    );

    const result: SessionPreviewResponse = {
      previewId,
      metadata,
      storyScript: undefined,
      sceneImage,
      avatarImage,
      partial: metadataFailed || sceneImage === null || avatarImage === null,
      storyScriptPending: true,
    };

    return c.json(result);
  },
);

// ─── GET /story-script/:previewId ─────────────────────────────────────────────

sessionPreviewRoute.get('/story-script/:previewId', (c) => {
  const previewId = c.req.param('previewId');
  const entry = storyScriptCache.get(previewId);

  if (!entry) {
    logger.warn(
      { event: 'story_script_not_found', previewId },
      'GET /story-script: previewId not found — may have expired or never existed',
    );
    return c.json({ status: 'not_found' }, 404);
  }

  if (entry.status === 'pending') {
    return c.json({ status: 'pending' });
  }

  if (entry.status === 'failed') {
    logger.warn(
      { event: 'story_script_poll_failed', previewId, error: entry.error },
      'GET /story-script: background generation had failed',
    );
    return c.json({ status: 'failed', error: entry.error });
  }

  if (entry.expiresAt < Date.now()) {
    storyScriptCache.delete(previewId);
    return c.json({ status: 'not_found' }, 404);
  }

  logger.info({ event: 'story_script_served', previewId }, 'GET /story-script: returning ready storyScript');
  return c.json({ status: 'ready', storyScript: entry.storyScript });
});
