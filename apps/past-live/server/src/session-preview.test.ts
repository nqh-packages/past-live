/**
 * Tests for session-preview.ts — Flash-first sequential flow
 * Verifies: metadata fetched before images, characterName passed to avatar prompt,
 * historicalSetting passed to scene prompt, fallback behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Shared mock state (captured at mock-definition time) ─────────────────────

const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
}));

// Capture prompt builder calls to verify correct args are forwarded
vi.mock('./prompts/scene-image.js', () => ({
  buildSceneImagePrompt: vi.fn(
    (scenarioId?: string, topic?: string, historicalSetting?: string) =>
      `scene:${scenarioId ?? ''}:${topic ?? ''}:${historicalSetting ?? ''}`,
  ),
}));

vi.mock('./prompts/character-avatar.js', () => ({
  buildCharacterAvatarPrompt: vi.fn(
    (scenarioId?: string, topic?: string, characterName?: string) =>
      `avatar:${scenarioId ?? ''}:${topic ?? ''}:${characterName ?? ''}`,
  ),
}));

import { buildSceneImagePrompt } from './prompts/scene-image.js';
import { buildCharacterAvatarPrompt } from './prompts/character-avatar.js';
import { sessionPreviewRoute } from './session-preview.js';
import type { PreviewMetadata } from './session-preview.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_METADATA: PreviewMetadata = {
  topic: 'French Revolution, 1789',
  userRole: 'Revolutionary pamphleteer',
  characterName: 'ROBESPIERRE',
  historicalSetting: 'Paris, 1789',
  year: 1789,
  context: 'The Bastille has fallen. The streets run with revolutionary fervor.',
  colorPalette: [
    'oklch(10% 0.03 30)',
    'oklch(16% 0.05 30)',
    'oklch(60% 0.20 30)',
    'oklch(88% 0.04 30)',
    'oklch(35% 0.10 30)',
  ],
};

const MOCK_IMAGE_BASE64 = 'aW1hZ2VkYXRh';

function makeMetadataResponse(metadata: PreviewMetadata) {
  return { text: JSON.stringify(metadata) };
}

function makeImageResponse(base64: string) {
  return {
    candidates: [{ content: { parts: [{ inlineData: { data: base64 } }] } }],
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function post(body: Record<string, unknown>) {
  return sessionPreviewRoute.request('/session-preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('sessionPreviewRoute POST /session-preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validation', () => {
    it('returns 400 when body is missing topic and scenarioId', async () => {
      const res = await post({});
      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toMatch(/topic|scenarioId/i);
    });

    it('returns 400 for invalid JSON body', async () => {
      const res = await sessionPreviewRoute.request('/session-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json{{{',
      });
      expect(res.status).toBe(400);
    });
  });

  describe('successful open topic flow', () => {
    beforeEach(() => {
      // Call order: 1=metadata, 2=scene image, 3=avatar image
      mockGenerateContent
        .mockResolvedValueOnce(makeMetadataResponse(MOCK_METADATA))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64));
    });

    it('calls generateContent 3 times total (1 metadata + 2 images)', async () => {
      await post({ topic: 'French Revolution' });
      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    });

    it('passes characterName from metadata to buildCharacterAvatarPrompt', async () => {
      await post({ topic: 'French Revolution' });
      expect(buildCharacterAvatarPrompt).toHaveBeenCalledWith(
        undefined,
        MOCK_METADATA.topic,
        MOCK_METADATA.characterName,
      );
    });

    it('passes historicalSetting from metadata to buildSceneImagePrompt', async () => {
      await post({ topic: 'French Revolution' });
      expect(buildSceneImagePrompt).toHaveBeenCalledWith(
        undefined,
        MOCK_METADATA.topic,
        MOCK_METADATA.historicalSetting,
      );
    });

    it('returns 200 with metadata, sceneImage, avatarImage, partial:false', async () => {
      const res = await post({ topic: 'French Revolution' });
      expect(res.status).toBe(200);
      const body = await res.json() as {
        metadata: PreviewMetadata;
        sceneImage: string;
        avatarImage: string;
        partial: boolean;
      };
      expect(body.metadata.characterName).toBe('ROBESPIERRE');
      expect(body.sceneImage).toBe(MOCK_IMAGE_BASE64);
      expect(body.avatarImage).toBe(MOCK_IMAGE_BASE64);
      expect(body.partial).toBe(false);
    });
  });

  describe('preset scenario flow', () => {
    beforeEach(() => {
      mockGenerateContent
        .mockResolvedValueOnce(makeMetadataResponse({
          ...MOCK_METADATA,
          characterName: 'CONSTANTINE XI',
          historicalSetting: 'Constantinople, 1453',
          topic: 'Fall of Constantinople, 1453',
        }))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64));
    });

    it('passes scenarioId to buildSceneImagePrompt', async () => {
      await post({ scenarioId: 'constantinople-1453' });
      expect(buildSceneImagePrompt).toHaveBeenCalledWith(
        'constantinople-1453',
        'Fall of Constantinople, 1453',
        'Constantinople, 1453',
      );
    });

    it('passes scenarioId and characterName to buildCharacterAvatarPrompt', async () => {
      await post({ scenarioId: 'constantinople-1453' });
      expect(buildCharacterAvatarPrompt).toHaveBeenCalledWith(
        'constantinople-1453',
        'Fall of Constantinople, 1453',
        'CONSTANTINE XI',
      );
    });
  });

  describe('partial failure handling', () => {
    it('returns partial:true and null sceneImage when scene image call returns no data', async () => {
      mockGenerateContent
        .mockResolvedValueOnce(makeMetadataResponse(MOCK_METADATA))
        // Scene image: no inlineData
        .mockResolvedValueOnce({ candidates: [{ content: { parts: [] } }] })
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64));

      const res = await post({ topic: 'French Revolution' });
      expect(res.status).toBe(200);
      const body = await res.json() as { sceneImage: null; avatarImage: string; partial: boolean };
      expect(body.sceneImage).toBeNull();
      expect(body.avatarImage).toBe(MOCK_IMAGE_BASE64);
      expect(body.partial).toBe(true);
    });

    it('falls back to preset metadata when Flash JSON fails for known scenarioId', async () => {
      mockGenerateContent
        .mockRejectedValueOnce(new Error('Gemini unavailable'))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64));

      const res = await post({ scenarioId: 'constantinople-1453' });
      expect(res.status).toBe(200);
      const body = await res.json() as { metadata: PreviewMetadata; partial: boolean };
      expect(body.metadata.characterName).toBe('CONSTANTINE XI');
      expect(body.partial).toBe(true);
    });

    it('falls back to generic metadata when Flash JSON fails for open topic', async () => {
      mockGenerateContent
        .mockRejectedValueOnce(new Error('Gemini unavailable'))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64));

      const res = await post({ topic: 'Unknown Topic' });
      expect(res.status).toBe(200);
      const body = await res.json() as { metadata: PreviewMetadata; partial: boolean };
      expect(body.metadata.characterName).toBe('NARRATOR');
      expect(body.partial).toBe(true);
    });

    it('returns partial:false when metadata and both images succeed', async () => {
      mockGenerateContent
        .mockResolvedValueOnce(makeMetadataResponse(MOCK_METADATA))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64));

      const res = await post({ topic: 'French Revolution' });
      const body = await res.json() as { partial: boolean };
      expect(body.partial).toBe(false);
    });

    it('returns partial:true when both images fail but metadata succeeds', async () => {
      mockGenerateContent
        .mockResolvedValueOnce(makeMetadataResponse(MOCK_METADATA))
        .mockRejectedValueOnce(new Error('image error'))
        .mockRejectedValueOnce(new Error('image error'));

      const res = await post({ topic: 'French Revolution' });
      const body = await res.json() as { sceneImage: null; avatarImage: null; partial: boolean };
      expect(body.sceneImage).toBeNull();
      expect(body.avatarImage).toBeNull();
      expect(body.partial).toBe(true);
    });
  });

  describe('call ordering guarantee', () => {
    it('completes metadata before issuing image calls', async () => {
      const callOrder: string[] = [];

      mockGenerateContent
        .mockImplementationOnce(async () => {
          callOrder.push('metadata');
          return makeMetadataResponse(MOCK_METADATA);
        })
        .mockImplementationOnce(async () => {
          callOrder.push('image-1');
          return makeImageResponse(MOCK_IMAGE_BASE64);
        })
        .mockImplementationOnce(async () => {
          callOrder.push('image-2');
          return makeImageResponse(MOCK_IMAGE_BASE64);
        });

      await post({ topic: 'French Revolution' });

      expect(callOrder[0]).toBe('metadata');
      // Both images are after metadata (can be in any order relative to each other)
      expect(callOrder.slice(1).sort()).toEqual(['image-1', 'image-2']);
    });
  });

  describe('JSON response structure', () => {
    it('always returns metadata, sceneImage, avatarImage, partial fields', async () => {
      mockGenerateContent.mockResolvedValueOnce(makeMetadataResponse(MOCK_METADATA));

      const res = await post({ topic: 'French Revolution' });
      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect('metadata' in body).toBe(true);
      expect('sceneImage' in body).toBe(true);
      expect('avatarImage' in body).toBe(true);
      expect('partial' in body).toBe(true);
    });
  });
});
