/**
 * Tests for session-preview.ts — Flash-first sequential flow
 * Verifies: metadata fetched before images, characterName passed to avatar prompt,
 * historicalSetting passed to scene prompt, fallback behavior, flash response types.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Shared mock state (captured at mock-definition time) ─────────────────────

const mockGenerateContent = vi.fn();

vi.mock('@google/genai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@google/genai')>();
  return {
    ...actual,
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      models: { generateContent: mockGenerateContent },
    })),
  };
});

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
  userRole: 'A stranger from beyond the barricades',
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
  voiceName: 'Algieba',
  decisionPoints: [
    { title: 'Support the Terror', description: 'Purge the enemies of the revolution.' },
    { title: 'Seek moderation', description: 'Halt the executions. Risk appearing weak.' },
  ],
};

const MOCK_IMAGE_BASE64 = 'aW1hZ2VkYXRh';

/** Wraps metadata into the new { type: 'ready', metadata } Flash response shape. */
function makeReadyResponse(metadata: PreviewMetadata) {
  return { text: JSON.stringify({ type: 'ready', metadata }) };
}

function makeImageResponse(base64: string) {
  return {
    candidates: [{ content: { parts: [{ inlineData: { data: base64 } }] } }],
  };
}

function makeClarifyResponse(options: { title: string; description: string }[]) {
  return { text: JSON.stringify({ type: 'clarify', options }) };
}

function makeBlockedResponse(alternatives: { title: string; description: string }[]) {
  return { text: JSON.stringify({ type: 'blocked', alternatives }) };
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
      // Call order: 1=metadata (Flash), 2=scene image, 3=avatar image
      mockGenerateContent
        .mockResolvedValueOnce(makeReadyResponse(MOCK_METADATA))
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

    it('includes voiceName in the returned metadata', async () => {
      const res = await post({ topic: 'French Revolution' });
      const body = await res.json() as { metadata: PreviewMetadata };
      expect(body.metadata.voiceName).toBe('Algieba');
    });

    it('includes decisionPoints in the returned metadata', async () => {
      const res = await post({ topic: 'French Revolution' });
      const body = await res.json() as { metadata: PreviewMetadata };
      expect(Array.isArray(body.metadata.decisionPoints)).toBe(true);
      expect(body.metadata.decisionPoints.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('preset scenario flow', () => {
    beforeEach(() => {
      mockGenerateContent
        .mockResolvedValueOnce(makeReadyResponse({
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

  describe('Flash response type: clarify', () => {
    it('returns clarify response immediately without image calls', async () => {
      const options = [
        { title: 'Fall of Saigon, 1975', description: 'Embassy evacuation decision.' },
        { title: 'Tet Offensive, 1968', description: 'Surprise attack on Hue.' },
        { title: 'Gulf of Tonkin, 1964', description: 'Escalation decision.' },
      ];
      mockGenerateContent.mockResolvedValueOnce(makeClarifyResponse(options));

      const res = await post({ topic: 'Vietnam War' });
      expect(res.status).toBe(200);

      const body = await res.json() as { type: string; options: { title: string; description: string }[] };
      expect(body.type).toBe('clarify');
      expect(body.options).toHaveLength(3);
      expect(body.options[0].title).toBe('Fall of Saigon, 1975');

      // No image calls made for clarify
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });
  });

  describe('Flash response type: blocked', () => {
    it('returns blocked response immediately without image calls', async () => {
      const alternatives = [
        { title: 'Sophie Scholl, 1943', description: 'White Rose resistance.' },
        { title: 'Oskar Schindler, 1944', description: 'Saved 1,200 lives.' },
        { title: 'Irena Sendler, 1943', description: 'Smuggled children from the Warsaw Ghetto.' },
      ];
      mockGenerateContent.mockResolvedValueOnce(makeBlockedResponse(alternatives));

      const res = await post({ topic: 'Adolf Hitler' });
      expect(res.status).toBe(200);

      const body = await res.json() as { type: string; alternatives: { title: string; description: string }[] };
      expect(body.type).toBe('blocked');
      expect(body.alternatives).toHaveLength(3);

      // No image calls made for blocked
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });
  });

  describe('partial failure handling', () => {
    it('returns partial:true and null sceneImage when scene image call returns no data', async () => {
      mockGenerateContent
        .mockResolvedValueOnce(makeReadyResponse(MOCK_METADATA))
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
        .mockResolvedValueOnce(makeReadyResponse(MOCK_METADATA))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64));

      const res = await post({ topic: 'French Revolution' });
      const body = await res.json() as { partial: boolean };
      expect(body.partial).toBe(false);
    });

    it('returns partial:true when both images fail but metadata succeeds', async () => {
      mockGenerateContent
        .mockResolvedValueOnce(makeReadyResponse(MOCK_METADATA))
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
          return makeReadyResponse(MOCK_METADATA);
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
    it('always returns metadata, sceneImage, avatarImage, partial fields for ready responses', async () => {
      mockGenerateContent.mockResolvedValueOnce(makeReadyResponse(MOCK_METADATA));

      const res = await post({ topic: 'French Revolution' });
      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect('metadata' in body).toBe(true);
      expect('sceneImage' in body).toBe(true);
      expect('avatarImage' in body).toBe(true);
      expect('partial' in body).toBe(true);
    });

    it('returned metadata includes voiceName and decisionPoints', async () => {
      mockGenerateContent
        .mockResolvedValueOnce(makeReadyResponse(MOCK_METADATA))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64));

      const res = await post({ topic: 'French Revolution' });
      const body = await res.json() as { metadata: PreviewMetadata };
      expect(typeof body.metadata.voiceName).toBe('string');
      expect(body.metadata.voiceName.length).toBeGreaterThan(0);
      expect(Array.isArray(body.metadata.decisionPoints)).toBe(true);
    });
  });

  describe('preset fallback fields', () => {
    it('Constantinople preset fallback has voiceName Gacrux', async () => {
      // Flash fails → use preset
      mockGenerateContent
        .mockRejectedValueOnce(new Error('Gemini unavailable'))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64));

      const res = await post({ scenarioId: 'constantinople-1453' });
      const body = await res.json() as { metadata: PreviewMetadata };
      expect(body.metadata.voiceName).toBe('Gacrux');
    });

    it('Constantinople preset fallback has decisionPoints', async () => {
      mockGenerateContent
        .mockRejectedValueOnce(new Error('Gemini unavailable'))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64));

      const res = await post({ scenarioId: 'constantinople-1453' });
      const body = await res.json() as { metadata: PreviewMetadata };
      expect(body.metadata.decisionPoints.length).toBeGreaterThanOrEqual(2);
    });

    it('Constantinople preset userRole is stranger framing', async () => {
      mockGenerateContent
        .mockRejectedValueOnce(new Error('Gemini unavailable'))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64));

      const res = await post({ scenarioId: 'constantinople-1453' });
      const body = await res.json() as { metadata: PreviewMetadata };
      expect(/stranger/i.test(body.metadata.userRole)).toBe(true);
    });

    it('Moon preset userRole is stranger framing', async () => {
      mockGenerateContent
        .mockRejectedValueOnce(new Error('Gemini unavailable'))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64));

      const res = await post({ scenarioId: 'moon-landing-1969' });
      const body = await res.json() as { metadata: PreviewMetadata };
      expect(/unknown voice|stranger/i.test(body.metadata.userRole)).toBe(true);
    });

    it('Mongol preset userRole is stranger framing', async () => {
      mockGenerateContent
        .mockRejectedValueOnce(new Error('Gemini unavailable'))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64));

      const res = await post({ scenarioId: 'mongol-empire-1206' });
      const body = await res.json() as { metadata: PreviewMetadata };
      expect(/stranger/i.test(body.metadata.userRole)).toBe(true);
    });
  });
});
