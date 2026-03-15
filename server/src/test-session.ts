/**
 * @what - POST /test-session — text-only conversation test endpoint
 * @why - Testing requires audio hardware. This endpoint lets CI and tooling verify
 *        conversation flow without mic or speakers — just JSON in, JSON out.
 * @exports - testSessionRoute
 */

import { Hono } from 'hono';
import { getAI } from './ai-client.js';
import { getScenarioMeta, buildSystemPrompt } from './scenarios.js';
import { logger } from './logger.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const FLASH_MODEL = 'gemini-3-flash-preview';

const DEFAULT_STUDENT_MESSAGE =
  "Hello, I'm calling about your situation. What's happening?";

// ─── Request / Response types ─────────────────────────────────────────────────

interface TestSessionRequest {
  scenarioId?: string;
  topic?: string;
  studentMessage?: string;
}

interface TestSessionResponse {
  characterResponse: string;
  systemPrompt: string;
  scenarioId?: string;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const testSessionRoute = new Hono();

testSessionRoute.post('/test-session', async (c) => {
  let body: TestSessionRequest;

  try {
    body = await c.req.json<TestSessionRequest>();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { scenarioId, topic, studentMessage } = body;

  // Validate: exactly one of scenarioId or topic
  const hasScenario = typeof scenarioId === 'string' && scenarioId.length > 0;
  const hasTopic = typeof topic === 'string' && topic.length > 0;

  if (!hasScenario && !hasTopic) {
    return c.json(
      { error: 'Provide exactly one of scenarioId or topic' },
      400,
    );
  }

  if (hasScenario && hasTopic) {
    return c.json(
      { error: 'Provide exactly one of scenarioId or topic — not both' },
      400,
    );
  }

  // Resolve system prompt
  let systemPrompt: string;
  let resolvedScenarioId: string | undefined;

  if (hasScenario) {
    const meta = getScenarioMeta(scenarioId!);
    if (!meta) {
      return c.json({ error: `Unknown scenarioId: ${scenarioId}` }, 400);
    }
    systemPrompt = buildSystemPrompt(meta.role, `${meta.title}, ${meta.year}`);
    resolvedScenarioId = scenarioId;
  } else {
    systemPrompt = buildSystemPrompt(topic!, topic!);
  }

  const userContent = studentMessage ?? DEFAULT_STUDENT_MESSAGE;

  logger.info(
    {
      event: 'test_session_request',
      code: 'TEST_SESSION_001',
      scenarioId: resolvedScenarioId,
      topic,
      studentMessage: userContent.slice(0, 80),
    },
    'Test session request received',
  );

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      config: {
        systemInstruction: systemPrompt,
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userContent }],
        },
      ],
    });

    const characterResponse = response.text ?? '';

    if (!characterResponse.trim()) {
      logger.error(
        {
          event: 'test_session_empty_response',
          code: 'TEST_SESSION_002',
          scenarioId: resolvedScenarioId,
          topic,
        },
        'Gemini returned empty response for test session',
      );
      return c.json({ error: 'Gemini returned an empty response', detail: 'Empty text from model' }, 500);
    }

    logger.info(
      {
        event: 'test_session_success',
        code: 'TEST_SESSION_003',
        scenarioId: resolvedScenarioId,
        topic,
        responseLength: characterResponse.length,
      },
      'Test session response generated',
    );

    const result: TestSessionResponse = {
      characterResponse,
      systemPrompt,
      ...(resolvedScenarioId ? { scenarioId: resolvedScenarioId } : {}),
    };

    return c.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gemini request failed';

    logger.error(
      {
        event: 'test_session_error',
        code: 'TEST_SESSION_004',
        err,
        scenarioId: resolvedScenarioId,
        topic,
        action: 'Check GEMINI_API_KEY and model availability',
      },
      'Test session Gemini call failed',
    );

    return c.json({ error: 'Failed to generate character response', detail: message }, 500);
  }
});
