/**
 * @what - POST /session-preview — Flash JSON first, then 2-way parallel image calls
 * @why - Avatar prompt requires characterName from the Flash JSON result; running all
 *        3 calls in parallel gave the avatar generator "A historical figure" as the
 *        only name hint, causing empty/garbage images for open topics.
 * @exports - sessionPreviewRoute, PreviewMetadata, SessionPreviewResponse, FlashResponse
 */

import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { buildSceneImagePrompt } from './prompts/scene-image.js';
import { buildCharacterAvatarPrompt } from './prompts/character-avatar.js';
import { VOICE_SELECTION_PROMPT } from './behavioral-rules.js';
import { logger } from './logger.js';
import { getAI } from './ai-client.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const FLASH_MODEL = 'gemini-3-flash-preview';
const IMAGE_MODEL = 'gemini-3.1-flash-image-preview';
const MAX_BODY_SIZE = 2 * 1024 * 1024; // 2 MB

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionPreviewRequest {
  topic?: string;
  scenarioId?: string;
}

export interface PreviewMetadata {
  topic: string;
  /**
   * How the character would describe the stranger who called them.
   * NOT a student role — the student has no assigned role.
   * e.g. "A stranger who called in the dead of night"
   */
  userRole: string;
  characterName: string;
  historicalSetting: string;
  year: number;
  context: string;
  colorPalette: string[]; // 5 OKLCH values
  /** Voice name from the 30-voice catalog, selected by Flash. */
  voiceName: string;
  /** 2-3 key decision moments for announce_choice. */
  decisionPoints: { title: string; description: string }[];
}

/** Flash returns one of three response types based on topic specificity and safety. */
export type FlashResponse =
  | { type: 'ready'; metadata: PreviewMetadata }
  | { type: 'clarify'; options: { title: string; description: string }[] }
  | { type: 'blocked'; alternatives: { title: string; description: string }[] };

export interface SessionPreviewResponse {
  metadata: PreviewMetadata;
  sceneImage: string | null;   // base64 PNG/JPEG — null on failure
  avatarImage: string | null;  // base64 PNG/JPEG — null on failure
  partial: boolean;            // true when one or more calls failed
}

// ─── Schema prompt ───────────────────────────────────────────────────────────

function buildMetadataPrompt(topic: string): string {
  return `
You are setting up a historical voice call for a student who wants to speak with a historical figure.

The student's topic: "${topic}"

FIRST: Determine the response type:
- If the topic maps to ONE specific historical person at ONE specific moment with a clear decision point, return type "ready".
- If the topic is broad (spans years, multiple events, or no clear single decision), return type "clarify" with 3 specific people+moments to call.
- If the person is a perpetrator of genocide, mass violence, or serial crime (e.g. Hitler, Pol Pot, serial killers), return type "blocked" with 3 alternative people who witnessed or resisted the same events.

For "ready", return ONLY valid JSON matching this exact schema:
{
  "type": "ready",
  "metadata": {
    "topic": "short topic title (e.g. Fall of Constantinople, 1453)",
    "userRole": "How the character would describe the stranger who called them. NOT the student's role. e.g. 'A stranger who called in the dead of night' or 'An unknown voice on the comm'",
    "characterName": "the AI character's name in ALL CAPS (e.g. CONSTANTINE XI)",
    "historicalSetting": "location and era in one phrase (e.g. Constantinople, 1453)",
    "year": 1453,
    "context": "2-3 sentences. Plain language. What the situation is and what is at stake.",
    "colorPalette": ["oklch(10% 0.04 45)", "oklch(16% 0.06 45)", "oklch(65% 0.18 45)", "oklch(90% 0.04 45)", "oklch(38% 0.10 45)"],
    "voiceName": "one voice name from the catalog below",
    "decisionPoints": [
      { "title": "choice title (the option)", "description": "what it means and its consequence" },
      { "title": "...", "description": "..." }
    ]
  }
}

For "clarify", return:
{
  "type": "clarify",
  "options": [
    { "title": "Person + Year (e.g. Fall of Saigon, 1975)", "description": "The specific decision they faced" },
    { "title": "...", "description": "..." },
    { "title": "...", "description": "..." }
  ]
}

For "blocked", return:
{
  "type": "blocked",
  "alternatives": [
    { "title": "Alternative person + Year", "description": "Brief: who they were and what they did" },
    { "title": "...", "description": "..." },
    { "title": "...", "description": "..." }
  ]
}

colorPalette rules (for "ready" only):
  [0] background: lightness 8-15% (very dark)
  [1] surface: lightness 12-20% (dark panel)
  [2] accent: lightness 55-75% (vibrant era color)
  [3] foreground: lightness 85-95% (readable text)
  [4] muted: lightness 30-45% (subtle/secondary)
The foreground MUST have at least 7:1 contrast ratio against the background.

decisionPoints: 2-3 concrete choices the student will face at the key moment. Each has title (the option) and description (what it means and its consequence).

${VOICE_SELECTION_PROMPT}

No markdown. No code fences. Just the JSON object.
`.trim();
}

// ─── Preset fallbacks ─────────────────────────────────────────────────────────

const PRESET_FALLBACKS: Record<string, PreviewMetadata> = {
  'constantinople-1453': {
    topic: 'Fall of Constantinople, 1453',
    userRole: 'A stranger who called in the dead of night',
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
    voiceName: 'Gacrux',
    decisionPoints: [
      { title: 'Reinforce the land walls', description: 'Concentrate 300 men at the breach. Harbor unguarded.' },
      { title: 'Attempt a breakout north', description: 'Risk everything on escape. The city falls behind you.' },
      { title: 'Negotiate surrender', description: 'Save lives. Lose the city. Mehmed may show mercy.' },
    ],
  },
  'moon-landing-1969': {
    topic: 'Apollo 11 Moon Landing, 1969',
    userRole: 'An unknown voice on the comm',
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
    voiceName: 'Charon',
    decisionPoints: [
      { title: 'Abort the landing', description: 'Safe return. Mission failed. Come back next year.' },
      { title: 'Trust the pilot', description: '25 seconds. Armstrong can see the surface. Let him land.' },
    ],
  },
  'mongol-empire-1206': {
    topic: 'Rise of the Mongol Empire, 1206',
    userRole: 'A stranger at the campfire before dawn',
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
    voiceName: 'Algenib',
    decisionPoints: [
      { title: 'Ride to Temujin', description: 'Join the empire. Your tribe survives. Your pride does not.' },
      { title: 'Stand with Jamukha', description: 'Fight for freedom. History forgets your name. But you rode free.' },
      { title: 'Demand terms', description: 'Negotiate a position. Risky — Temujin does not negotiate.' },
    ],
  },
};

const GENERIC_FALLBACK: PreviewMetadata = {
  topic: 'A Historical Moment',
  userRole: 'A stranger from the future',
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
  voiceName: 'Charon',
  decisionPoints: [],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveEffectiveTopic(request: SessionPreviewRequest): string {
  if (request.topic) return request.topic;
  const preset = request.scenarioId ? PRESET_FALLBACKS[request.scenarioId] : undefined;
  return preset?.topic ?? 'a historical moment';
}

export async function fetchFlashResponse(topic: string): Promise<FlashResponse> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: FLASH_MODEL,
    contents: [{ role: 'user', parts: [{ text: buildMetadataPrompt(topic) }] }],
  });

  const raw = response.text?.trim() ?? '';
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  const parsed = JSON.parse(cleaned) as FlashResponse;

  if (parsed.type === 'clarify' || parsed.type === 'blocked') {
    return parsed;
  }

  // Validate 'ready' response
  const meta = (parsed as { type: 'ready'; metadata: PreviewMetadata }).metadata;
  if (
    typeof meta.topic !== 'string' ||
    typeof meta.userRole !== 'string' ||
    typeof meta.characterName !== 'string' ||
    typeof meta.historicalSetting !== 'string' ||
    typeof meta.year !== 'number' ||
    typeof meta.context !== 'string' ||
    !Array.isArray(meta.colorPalette) ||
    meta.colorPalette.length !== 5 ||
    typeof meta.voiceName !== 'string' ||
    !Array.isArray(meta.decisionPoints)
  ) {
    throw new Error('Metadata response missing required fields');
  }

  return parsed as FlashResponse;
}


async function fetchImage(prompt: string): Promise<string | null> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

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

    // ── Step 1: Flash JSON first — avatar image needs characterName ───────────

    let flashResponse: FlashResponse | null = null;
    let metadataFailed = false;

    try {
      flashResponse = await fetchFlashResponse(effectiveTopic);
    } catch (err) {
      metadataFailed = true;
      logger.error({ event: 'metadata_failed', code: 'PREVIEW_METADATA_001', err, topic: effectiveTopic }, 'Flash metadata call failed');
    }

    // Return clarify/blocked responses immediately — no images needed
    if (flashResponse && flashResponse.type !== 'ready') {
      return c.json(flashResponse);
    }

    let metadata: PreviewMetadata;

    if (flashResponse?.type === 'ready') {
      metadata = flashResponse.metadata;
    } else {
      // Fallback: use preset or generic
      metadata = (scenarioId ? PRESET_FALLBACKS[scenarioId] : undefined) ?? GENERIC_FALLBACK;
    }

    // ── Step 2: Scene image + avatar image in parallel ────────────────────────

    const [sceneResult, avatarResult] = await Promise.allSettled([
      fetchImage(buildSceneImagePrompt(scenarioId, metadata.topic, metadata.historicalSetting)),
      fetchImage(buildCharacterAvatarPrompt(scenarioId, metadata.topic, metadata.characterName)),
    ]);

    const sceneImage = sceneResult.status === 'fulfilled' ? sceneResult.value : null;
    const avatarImage = avatarResult.status === 'fulfilled' ? avatarResult.value : null;

    if (sceneResult.status === 'rejected') {
      logger.error({ event: 'scene_image_failed', code: 'PREVIEW_IMAGE_001', err: sceneResult.reason }, 'Scene image call failed');
    }
    if (avatarResult.status === 'rejected') {
      logger.error({ event: 'avatar_image_failed', code: 'PREVIEW_IMAGE_002', err: avatarResult.reason }, 'Avatar image call failed');
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
