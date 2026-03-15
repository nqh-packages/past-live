/**
 * Tests for session-preview.ts — 2-phase + Phase 3 (pre-gen scenes) Flash flow
 * Phase 1: POST /session-preview returns metadata + images (fast ~2-3s), storyScriptPending=true.
 * Phase 2: Background generateStoryScriptAsync stores result; GET /story-script/:previewId polls.
 * Phase 3: Pre-generates all scene images in background after storyScript is ready.
 * Preset scenarios: synchronous storyScript in POST response (no background generation).
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

// Prevent real Firestore calls from api-call-logger (fire-and-forget, no-op in tests)
vi.mock('./api-call-logger.js', () => ({
  logApiCall: vi.fn(() => Promise.resolve('')),
  completeApiCall: vi.fn(() => Promise.resolve(undefined)),
}));

// Prevent real image generation from Phase 3 scene pre-gen (fire-and-forget in background)
const mockGenerateSceneImage = vi.fn().mockResolvedValue(null);
vi.mock('./scene-image.js', () => ({
  generateSceneImage: (...args: unknown[]) => mockGenerateSceneImage(...args),
}));

// Capture prompt builder calls to verify correct args are forwarded
vi.mock('./prompts/scene-image.js', () => ({
  buildSceneImagePrompt: vi.fn(
    (scenarioId?: string, topic?: string, historicalSetting?: string) =>
      `scene:${scenarioId ?? ''}:${topic ?? ''}:${historicalSetting ?? ''}`,
  ),
  getSceneReferenceImage: vi.fn(() => null),
}));

vi.mock('./prompts/character-avatar.js', () => ({
  buildCharacterAvatarPrompt: vi.fn(
    (scenarioId?: string, topic?: string, characterName?: string) =>
      `avatar:${scenarioId ?? ''}:${topic ?? ''}:${characterName ?? ''}`,
  ),
  getAvatarReferenceImage: vi.fn(() => null),
}));

import { buildSceneImagePrompt } from './prompts/scene-image.js';
import { buildCharacterAvatarPrompt } from './prompts/character-avatar.js';
import { sessionPreviewRoute } from './session-preview.js';
import type { PreviewMetadata, StoryScript } from './session-preview.js';

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
  voiceName: 'Charon',
  decisionPoints: [
    { title: 'Support the Terror', description: 'Purge the enemies of the revolution.' },
    { title: 'Seek moderation', description: 'Halt the executions. Risk appearing weak.' },
  ],
};

const MOCK_IMAGE_BASE64 = 'aW1hZ2VkYXRh';

const MOCK_STORY_SCRIPT: StoryScript = {
  personality: {
    voice: 'Sharp, dry, amused. States absurd facts casually.',
    humor: 'The gap between how insane the situation was and how calmly he describes it.',
    quirks: 'Keeps using military precision language for utterly mundane observations.',
    energy: 'Calm under pressure. Dry wit that gets drier as the crisis gets worse.',
    celebrityAnchor: 'Bill Murray playing a doomed emperor',
  },
  hooks: [
    {
      myth: 'He died fighting alone at the last breach',
      truth: 'He led a charge and was lost in the crowd — nobody knows exactly where',
      surprise: 'The last emperor of Rome disappeared so completely that historians argue about it today',
      anchor: 'Like the team captain who goes down with the ship — except nobody saw it happen',
    },
    {
      myth: 'The city fell because of a traitor',
      truth: 'A small gate called the Kerkoporta was left unlocked — probably by accident',
      surprise: 'The thousand-year empire ended because someone forgot to lock a door',
      anchor: 'Forgetting to lock up before leaving is apparently a universal human problem',
    },
    {
      myth: 'Mehmed had overwhelming numbers and it was inevitable',
      truth: 'Constantine held for 53 days with 7,000 against 80,000 — nearly twice what anyone expected',
      surprise: 'They were this close. If the Venetian relief fleet had arrived two weeks earlier...',
      anchor: 'Your whole team pulls together for the championship and loses in overtime',
    },
  ],
  facts: [
    'Constantine XI had 7,000 defenders against 80,000 Ottoman troops',
    'Mehmed II brought 72 ships overland on greased logs to bypass the harbor chain',
    'The city had survived 23 sieges over 1,000 years before this one',
    'Constantine refused three offers of safe passage to flee',
    'The fall ended the Byzantine Empire — the continuation of the Roman Empire — after 1,500 years',
  ],
  choices: [
    {
      setup: 'The harbor chain is holding but the northern shore is exposed. You have 300 men left.',
      options: [
        { title: 'Reinforce the land walls', description: 'Concentrate your last men at the breach. Harbor left unguarded.' },
        { title: 'Attempt breakout north', description: 'Risk everything on escape. Save your men. Lose the city.' },
      ],
      consequences: {
        'Reinforce the land walls': 'What he did — held for 4 more hours until the Kerkoporta gate was found unlocked.',
        'Attempt breakout north': 'Several commanders took this route. Most made it to safety.',
      },
    },
  ],
  scenes: [
    {
      title: 'The walls at dawn',
      description: 'Stone battlements of ancient Constantinople at first light, smoke rising from the city below, a small group of armored figures standing watch over a vast Ottoman camp stretching to the horizon.',
    },
  ],
  closingThread: 'Every wall falls eventually. The question is how long you hold it.',
};

/** Wraps metadata into the new { type: 'ready', metadata } Flash response shape. */
function makeReadyResponse(metadata: PreviewMetadata) {
  return { text: JSON.stringify({ type: 'ready', metadata }) };
}

/** Wraps metadata + storyScript into the full Flash response shape. */
function makeReadyResponseWithScript(metadata: PreviewMetadata, storyScript: StoryScript) {
  return { text: JSON.stringify({ type: 'ready', metadata, storyScript }) };
}

function makeImageResponse(base64: string) {
  return {
    candidates: [{ content: { parts: [{ inlineData: { data: base64 } }] } }],
  };
}

// makeClarifyResponse removed — clarify flow no longer exists.
// Flash always returns "ready" for any input (topic, era, concept, person).

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
      // Call order: 1=metadata (Flash), 2=scene image, 3=avatar image,
      // 4=background storyScript (generateStoryScriptAsync, fire-and-forget)
      mockGenerateContent
        .mockResolvedValueOnce(makeReadyResponse(MOCK_METADATA))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce({ text: JSON.stringify(MOCK_STORY_SCRIPT) }); // background storyScript
    });

    it('calls generateContent 4 times total (1 metadata + 2 images + 1 background storyScript)', async () => {
      await post({ topic: 'French Revolution' });
      // Phase 1 = 3 calls (metadata + 2 images).
      // Phase 2 = 1 background call (storyScript via generateStoryScriptAsync, fires in next microtask).
      expect(mockGenerateContent).toHaveBeenCalledTimes(4);
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
      expect(body.metadata.voiceName).toBe('Charon');
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
      // Preset path skips Flash metadata entirely — only 2 image calls.
      mockGenerateContent
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

  describe('Flash always returns ready (clarify flow removed)', () => {
    it('returns session preview directly for topic input — no clarify step', async () => {
      // Flash now picks the single best figure for any topic input and returns "ready"
      mockGenerateContent
        .mockResolvedValueOnce(makeReadyResponse(MOCK_METADATA))
        .mockResolvedValueOnce(makeReadyResponse(MOCK_METADATA))
        .mockResolvedValue(makeImageResponse('fake-image-base64'));

      const res = await post({ topic: 'Vietnam War' });
      expect(res.status).toBe(200);

      const body = await res.json() as { metadata: { characterName: string }; storyScriptPending: boolean };
      expect(body.metadata).toBeDefined();
      expect(body.storyScriptPending).toBe(true);
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
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce({ text: JSON.stringify(MOCK_STORY_SCRIPT) }); // background storyScript

      const res = await post({ topic: 'French Revolution' });
      expect(res.status).toBe(200);
      const body = await res.json() as { sceneImage: null; avatarImage: string; partial: boolean };
      expect(body.sceneImage).toBeNull();
      expect(body.avatarImage).toBe(MOCK_IMAGE_BASE64);
      expect(body.partial).toBe(true);
    });

    it('returns preset metadata directly for known scenarioId (no Flash call)', async () => {
      // Preset path bypasses Flash entirely — uses cached preset metadata directly.
      // partial:false because both images succeed.
      mockGenerateContent
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64));

      const res = await post({ scenarioId: 'constantinople-1453' });
      expect(res.status).toBe(200);
      const body = await res.json() as { metadata: PreviewMetadata; partial: boolean };
      expect(body.metadata.characterName).toBe('CONSTANTINE XI');
      expect(body.partial).toBe(false);
    });

    it('falls back to generic metadata when Flash JSON fails for open topic', async () => {
      mockGenerateContent
        .mockRejectedValueOnce(new Error('Gemini unavailable'))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce({ text: JSON.stringify(MOCK_STORY_SCRIPT) }); // background storyScript on generic fallback

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
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce({ text: JSON.stringify(MOCK_STORY_SCRIPT) }); // background storyScript

      const res = await post({ topic: 'French Revolution' });
      const body = await res.json() as { partial: boolean };
      expect(body.partial).toBe(false);
    });

    it('returns partial:true when both images fail but metadata succeeds', async () => {
      mockGenerateContent
        .mockResolvedValueOnce(makeReadyResponse(MOCK_METADATA))
        .mockRejectedValueOnce(new Error('image error'))
        .mockRejectedValueOnce(new Error('image error'))
        .mockResolvedValueOnce({ text: JSON.stringify(MOCK_STORY_SCRIPT) }); // background storyScript

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
        })
        .mockImplementationOnce(async () => {
          callOrder.push('story-script'); // background phase 2
          return { text: JSON.stringify(MOCK_STORY_SCRIPT) };
        });

      await post({ topic: 'French Revolution' });

      expect(callOrder[0]).toBe('metadata');
      // Both images are after metadata (can be in any order relative to each other)
      expect(callOrder.slice(1, 3).sort()).toEqual(['image-1', 'image-2']);
    });
  });

  describe('JSON response structure', () => {
    it('always returns metadata, sceneImage, avatarImage, partial, previewId, storyScriptPending fields for ready responses', async () => {
      mockGenerateContent
        .mockResolvedValueOnce(makeReadyResponse(MOCK_METADATA))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce({ text: JSON.stringify(MOCK_STORY_SCRIPT) }); // background storyScript

      const res = await post({ topic: 'French Revolution' });
      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect('metadata' in body).toBe(true);
      expect('sceneImage' in body).toBe(true);
      expect('avatarImage' in body).toBe(true);
      expect('partial' in body).toBe(true);
      expect('previewId' in body).toBe(true);
      expect('storyScriptPending' in body).toBe(true);
    });

    it('returned metadata includes voiceName and decisionPoints', async () => {
      mockGenerateContent
        .mockResolvedValueOnce(makeReadyResponse(MOCK_METADATA))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce({ text: JSON.stringify(MOCK_STORY_SCRIPT) }); // background storyScript

      const res = await post({ topic: 'French Revolution' });
      const body = await res.json() as { metadata: PreviewMetadata };
      expect(typeof body.metadata.voiceName).toBe('string');
      expect(body.metadata.voiceName.length).toBeGreaterThan(0);
      expect(Array.isArray(body.metadata.decisionPoints)).toBe(true);
    });
  });

  describe('storyScript in response', () => {
    it('returns storyScriptPending:true and previewId for custom topic (2-phase design)', async () => {
      // 2-phase: POST returns metadata + images immediately; storyScript generates in background.
      // storyScript is NOT in the POST response for custom topics — client polls GET /story-script/:previewId.
      mockGenerateContent
        .mockResolvedValueOnce(makeReadyResponse(MOCK_METADATA))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce({ text: JSON.stringify(MOCK_STORY_SCRIPT) }); // background storyScript

      const res = await post({ topic: 'French Revolution' });
      expect(res.status).toBe(200);
      const body = await res.json() as { storyScript?: StoryScript; storyScriptPending: boolean; previewId: string };
      expect(body.storyScript).toBeUndefined();
      expect(body.storyScriptPending).toBe(true);
      expect(typeof body.previewId).toBe('string');
      expect(body.previewId.length).toBeGreaterThan(0);
    });

    it('storyScript is undefined in POST response when Flash metadata omits it', async () => {
      mockGenerateContent
        .mockResolvedValueOnce(makeReadyResponse(MOCK_METADATA))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce({ text: JSON.stringify(MOCK_STORY_SCRIPT) }); // background storyScript

      const res = await post({ topic: 'French Revolution' });
      expect(res.status).toBe(200);
      const body = await res.json() as { storyScript?: StoryScript };
      expect(body.storyScript).toBeUndefined();
    });

    it('storyScript is the preset storyScript when Flash fails and a known preset is used', async () => {
      // Presets carry their own hand-written storyScript — returned synchronously in POST.
      mockGenerateContent
        .mockRejectedValueOnce(new Error('Gemini unavailable'))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64));

      const res = await post({ scenarioId: 'constantinople-1453' });
      expect(res.status).toBe(200);
      const body = await res.json() as { storyScript?: StoryScript };
      expect(body.storyScript).toBeDefined();
      expect(typeof body.storyScript?.personality.celebrityAnchor).toBe('string');
      expect(body.storyScript?.hooks.length).toBeGreaterThanOrEqual(3);
    });

    it('preset storyScript response includes all required storyScript fields', async () => {
      // Preset path returns storyScript synchronously — validate all fields are present.
      mockGenerateContent
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64));

      const res = await post({ scenarioId: 'constantinople-1453' });
      const body = await res.json() as { storyScript?: StoryScript };
      expect(Array.isArray(body.storyScript?.hooks)).toBe(true);
      expect(body.storyScript!.hooks.length).toBeGreaterThanOrEqual(3);
      expect(Array.isArray(body.storyScript?.facts)).toBe(true);
      expect(Array.isArray(body.storyScript?.choices)).toBe(true);
      expect(Array.isArray(body.storyScript?.scenes)).toBe(true);
      expect(typeof body.storyScript?.closingThread).toBe('string');
    });
  });

  describe('preset fallback fields', () => {
    // Preset path skips Flash entirely — always uses cached preset metadata directly.
    // Only 2 generateContent calls are made (scene + avatar images).

    it('Constantinople preset has voiceName Achird', async () => {
      mockGenerateContent
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64));

      const res = await post({ scenarioId: 'constantinople-1453' });
      const body = await res.json() as { metadata: PreviewMetadata };
      expect(body.metadata.voiceName).toBe('Achird');
    });

    it('Constantinople preset has decisionPoints', async () => {
      mockGenerateContent
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64));

      const res = await post({ scenarioId: 'constantinople-1453' });
      const body = await res.json() as { metadata: PreviewMetadata };
      expect(body.metadata.decisionPoints.length).toBeGreaterThanOrEqual(2);
    });

    it('Constantinople preset userRole is stranger framing', async () => {
      mockGenerateContent
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64));

      const res = await post({ scenarioId: 'constantinople-1453' });
      const body = await res.json() as { metadata: PreviewMetadata };
      expect(/stranger/i.test(body.metadata.userRole)).toBe(true);
    });

    it('Moon preset userRole is stranger framing', async () => {
      mockGenerateContent
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64));

      const res = await post({ scenarioId: 'moon-landing-1969' });
      const body = await res.json() as { metadata: PreviewMetadata };
      expect(/unknown voice|stranger/i.test(body.metadata.userRole)).toBe(true);
    });

    it('Mongol preset userRole is stranger framing', async () => {
      mockGenerateContent
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64))
        .mockResolvedValueOnce(makeImageResponse(MOCK_IMAGE_BASE64));

      const res = await post({ scenarioId: 'mongol-empire-1206' });
      const body = await res.json() as { metadata: PreviewMetadata };
      expect(/stranger/i.test(body.metadata.userRole)).toBe(true);
    });
  });
});
