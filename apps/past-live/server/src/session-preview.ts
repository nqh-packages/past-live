/**
 * @what - POST /session-preview — 3 parallel Gemini calls: JSON metadata + scene image + character avatar
 * @why - Generates preview overlay content before the student enters a session
 * @exports - sessionPreviewRoute
 */

import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { GoogleGenAI } from '@google/genai';
import { buildSceneImagePrompt } from './prompts/scene-image.js';
import { buildCharacterAvatarPrompt } from './prompts/character-avatar.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const FLASH_MODEL = 'gemini-3-flash-preview';
const IMAGE_MODEL = 'gemini-3.1-flash-image-preview';
const MAX_BODY_SIZE = 2 * 1024 * 1024; // 2 MB

// ─── Client ───────────────────────────────────────────────────────────────────

let _ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!_ai) {
    _ai = new GoogleGenAI({ apiKey: process.env['GEMINI_API_KEY'] ?? '' });
  }
  return _ai;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionPreviewRequest {
  topic?: string;
  scenarioId?: string;
}

export interface PreviewMetadata {
  topic: string;
  userRole: string;
  characterName: string;
  historicalSetting: string;
  year: number;
  context: string;
  colorPalette: string[]; // 5 OKLCH values
}

export interface SessionPreviewResponse {
  metadata: PreviewMetadata;
  sceneImage: string | null;   // base64 PNG/JPEG — null on failure
  avatarImage: string | null;  // base64 PNG/JPEG — null on failure
  partial: boolean;            // true when one or more calls failed
}

// ─── Schema prompt ───────────────────────────────────────────────────────────

function buildMetadataPrompt(topic: string): string {
  return `
You are setting up a historical role-play session for a student.

The student's topic: "${topic}"

Return ONLY valid JSON matching this exact schema:
{
  "topic": "short topic title (e.g. Fall of Constantinople, 1453)",
  "userRole": "the student's role in 5-10 words (e.g. Emperor's trusted advisor)",
  "characterName": "the AI character's name in ALL CAPS (e.g. CONSTANTINE XI)",
  "historicalSetting": "location and era in one phrase (e.g. Constantinople, 1453)",
  "year": 1453,
  "context": "2-3 sentences. Plain language. What the situation is and what is at stake.",
  "colorPalette": ["oklch(10% 0.04 45)", "oklch(16% 0.06 45)", "oklch(65% 0.18 45)", "oklch(90% 0.04 45)", "oklch(38% 0.10 45)"]
}

colorPalette must be exactly 5 OKLCH color strings (CSS oklch() format) matching the era's atmosphere. STRICT lightness rules:
  [0] background: lightness 8-15% (very dark)
  [1] surface: lightness 12-20% (dark panel)
  [2] accent: lightness 55-75% (vibrant era color)
  [3] foreground: lightness 85-95% (readable text)
  [4] muted: lightness 30-45% (subtle/secondary)
The foreground MUST have at least 7:1 contrast ratio against the background.
No markdown. No code fences. Just the JSON object.
`.trim();
}

// ─── Preset fallbacks ─────────────────────────────────────────────────────────

const PRESET_FALLBACKS: Record<string, PreviewMetadata> = {
  'constantinople-1453': {
    topic: 'Fall of Constantinople, 1453',
    userRole: "Emperor's most trusted advisor",
    characterName: 'CONSTANTINE XI',
    historicalSetting: 'Constantinople, 1453',
    year: 1453,
    context:
      'The Ottoman Sultan Mehmed II has surrounded the city with 80,000 troops. You have fewer than 7,000 defenders. The harbor chain is holding — for now. Something is wrong on the northern shore.',
    colorPalette: [
      'oklch(62% 0.18 47)',
      'oklch(18% 0.07 47)',
      'oklch(73% 0.13 47)',
      'oklch(89% 0.04 47)',
      'oklch(48% 0.14 47)',
    ],
  },
  'moon-landing-1969': {
    topic: 'Apollo 11 Moon Landing, 1969',
    userRole: 'NASA Mission Control lead systems engineer',
    characterName: 'FLIGHT DIRECTOR KRANZ',
    historicalSetting: 'Houston Mission Control, 1969',
    year: 1969,
    context:
      'Eagle is 3,000 feet above the surface. The guidance computer is throwing 1202 alarms. Armstrong is flying manually. Propellant is tighter than the simulations showed. You have seconds to decide.',
    colorPalette: [
      'oklch(68% 0.10 240)',
      'oklch(15% 0.06 240)',
      'oklch(78% 0.08 240)',
      'oklch(92% 0.03 240)',
      'oklch(55% 0.12 240)',
    ],
  },
  'mongol-empire-1206': {
    topic: 'Rise of the Mongol Empire, 1206',
    userRole: 'Tribal chieftain with three clans uncommitted',
    characterName: 'JAMUKHA',
    historicalSetting: 'Mongolian steppe, 1206',
    year: 1206,
    context:
      'The great kurultai approaches. Temujin will be declared Genghis Khan by dawn if the last tribes submit. Your old sworn brother has sent an envoy with an offer of honor — if you arrive before the sun rises.',
    colorPalette: [
      'oklch(65% 0.14 68)',
      'oklch(20% 0.07 68)',
      'oklch(76% 0.10 68)',
      'oklch(90% 0.04 68)',
      'oklch(52% 0.12 68)',
    ],
  },
};

const GENERIC_FALLBACK: PreviewMetadata = {
  topic: 'A Historical Moment',
  userRole: 'A key participant in history',
  characterName: 'NARRATOR',
  historicalSetting: 'A pivotal moment in time',
  year: 0,
  context:
    'You have stepped into a critical moment in history. The decisions made here will echo for centuries. Listen carefully to the voices around you.',
  colorPalette: [
    'oklch(60% 0.08 60)',
    'oklch(18% 0.04 60)',
    'oklch(72% 0.06 60)',
    'oklch(88% 0.03 60)',
    'oklch(48% 0.07 60)',
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveEffectiveTopic(request: SessionPreviewRequest): string {
  if (request.topic) return request.topic;
  const preset = request.scenarioId ? PRESET_FALLBACKS[request.scenarioId] : undefined;
  return preset?.topic ?? 'a historical moment';
}

async function fetchMetadata(topic: string): Promise<PreviewMetadata> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: FLASH_MODEL,
    contents: [{ role: 'user', parts: [{ text: buildMetadataPrompt(topic) }] }],
  });

  const raw = response.text?.trim() ?? '';
  // Strip markdown code fences if model wraps the JSON
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  const parsed = JSON.parse(cleaned) as PreviewMetadata;

  // Validate required fields
  if (
    typeof parsed.topic !== 'string' ||
    typeof parsed.userRole !== 'string' ||
    typeof parsed.characterName !== 'string' ||
    typeof parsed.historicalSetting !== 'string' ||
    typeof parsed.year !== 'number' ||
    typeof parsed.context !== 'string' ||
    !Array.isArray(parsed.colorPalette) ||
    parsed.colorPalette.length !== 5
  ) {
    throw new Error('Metadata response missing required fields');
  }

  return parsed;
}

async function fetchImage(prompt: string): Promise<string | null> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    // Image model returns inlineData in the response parts
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        return part.inlineData.data; // base64 string
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const sessionPreviewRoute = new Hono();

sessionPreviewRoute.post(
  '/session-preview',
  bodyLimit({ maxSize: MAX_BODY_SIZE, onError: (c) => c.json({ error: 'Request too large (max 2 MB)' }, 413) }),
  async (c) => {
    let body: SessionPreviewRequest;

    try {
      body = await c.req.json<SessionPreviewRequest>();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const { topic, scenarioId } = body;

    if (!topic && !scenarioId) {
      return c.json({ error: 'Provide topic or scenarioId' }, 400);
    }

    const effectiveTopic = resolveEffectiveTopic(body);

    // ── 3 parallel Gemini calls ───────────────────────────────────────────────
    // Promise.allSettled — partial failure returns successful results + fallbacks.

    const [metaResult, sceneResult, avatarResult] = await Promise.allSettled([
      fetchMetadata(effectiveTopic),
      fetchImage(buildSceneImagePrompt(scenarioId, effectiveTopic)),
      fetchImage(buildCharacterAvatarPrompt(scenarioId, effectiveTopic)),
    ]);

    // ── Resolve metadata ──────────────────────────────────────────────────────

    let metadata: PreviewMetadata;
    let metadataFailed = false;

    if (metaResult.status === 'fulfilled') {
      metadata = metaResult.value;
    } else {
      metadataFailed = true;
      console.error('[session-preview] metadata call failed:', metaResult.reason);
      // Use preset fallback if scenarioId known, else generic
      metadata = (scenarioId && PRESET_FALLBACKS[scenarioId]) ?? GENERIC_FALLBACK;
    }

    // ── Resolve images ────────────────────────────────────────────────────────

    const sceneImage = sceneResult.status === 'fulfilled' ? sceneResult.value : null;
    const avatarImage = avatarResult.status === 'fulfilled' ? avatarResult.value : null;

    if (sceneResult.status === 'rejected') {
      console.error('[session-preview] scene image call failed:', sceneResult.reason);
    }
    if (avatarResult.status === 'rejected') {
      console.error('[session-preview] avatar call failed:', avatarResult.reason);
    }

    const partial = metadataFailed || sceneImage === null || avatarImage === null;

    const result: SessionPreviewResponse = {
      metadata,
      sceneImage,
      avatarImage,
      partial,
    };

    return c.json(result);
  },
);
