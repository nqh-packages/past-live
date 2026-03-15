/**
 * @what - Pure functions for building reconnect context strings injected into Gemini
 * @why - Both 1011 crash reconnect and browser-disconnect resume need the same context
 *   injection logic. Centralising here prevents the truncated 5+3 turn slice that caused
 *   the model to lose all context. Also hosts generateBrowserCloseSummary to keep
 *   relay.ts under 350 LOC.
 * @exports - buildReconnectContext, generateBrowserCloseSummary
 */

import { generatePostCallSummary } from './post-call-summary.js';
import { onSessionEnd } from './relay-hooks.js';
import { updateSession } from './session-persistence.js';
import { logCallTranscript } from './call-logger.js';
import { logger } from './logger.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReconnectContextParams {
  characterName: string;
  outputTranscripts: string[];
  inputTranscripts: string[];
  /** Accumulated tool call results for context replay. */
  toolCallResults: { name: string; result: string }[];
}

export interface ReconnectContext {
  /**
   * Full conversation context — injected via `sendContext()` (no VAD trigger).
   * Contains the entire conversation arc and tool outcomes.
   */
  context: string;
  /**
   * Brief in-character resume instruction — injected via `sendText()` (triggers model to speak).
   * Prompts the character to acknowledge the reconnection naturally and continue.
   */
  resumeInstruction: string;
}

// ─── State ref for generateBrowserCloseSummary ────────────────────────────────

export interface BrowserCloseStateRef {
  sessionId: string | null;
  characterName: string;
  historicalSetting: string;
  voiceName: string | undefined;
  systemPrompt: string;
  outputTranscripts: string[];
  inputTranscripts: string[];
  timeline: { ts: number; event: string; detail?: string }[];
  studentId: string | undefined;
  scenarioId: string | undefined;
  sessionStartMs: number | undefined;
}

// ─── Context builder ──────────────────────────────────────────────────────────

/**
 * Builds reconnect context from the full conversation history.
 *
 * Unlike the old `reconnectAfter1011` approach (last 5+3 turns), this uses the
 * complete transcript so the character never forgets earlier conversation threads
 * or which choices were presented.
 *
 * @pitfall - `context` must be injected via `sendContext()`, NOT `sendText()`.
 *   `sendText()` triggers VAD and would cause the model to interrupt itself.
 *   Only `resumeInstruction` should go through `sendText()`.
 */
export function buildReconnectContext(params: ReconnectContextParams): ReconnectContext {
  const { characterName, outputTranscripts, inputTranscripts, toolCallResults } = params;

  // Build conversation arc — interleave character + student turns for readability
  const conversationLines: string[] = [];

  // Use the full transcript arrays (no truncation)
  const outputParts = outputTranscripts.filter((t) => t.trim());
  const inputParts = inputTranscripts.filter((t) => t.trim());

  if (outputParts.length > 0) {
    conversationLines.push(`${characterName} said: ${outputParts.join(' | ')}`);
  }
  if (inputParts.length > 0) {
    conversationLines.push(`Student said: ${inputParts.join(' | ')}`);
  }

  // Summarise tool outcomes so the model knows what was already presented
  const toolLines: string[] = [];
  for (const { name, result } of toolCallResults) {
    if (name === 'show_scene') {
      toolLines.push(`A scene image was ${result}`);
    } else if (name === 'announce_choice') {
      toolLines.push(`Choices were ${result} — student has already seen them`);
    } else if (name === 'switch_speaker') {
      toolLines.push(`Speaker ${result}`);
    }
  }

  const contextParts = ['[Previous conversation context — full history]'];
  if (conversationLines.length > 0) {
    contextParts.push(...conversationLines);
  } else {
    contextParts.push('(Conversation just started — no prior turns)');
  }
  if (toolLines.length > 0) {
    contextParts.push('[Tools used]', ...toolLines);
  }
  contextParts.push('[Resume the conversation from this point — the student is back]');

  const context = contextParts.join('\n');

  const resumeInstruction =
    `You just lost connection briefly. Acknowledge it naturally in character — ` +
    `something like "lost you for a second there" — then continue exactly where you left off. ` +
    `Do NOT re-introduce yourself or repeat anything already said.`;

  return { context, resumeInstruction };
}

// ─── Browser close summary ─────────────────────────────────────────────────────

/**
 * Generates a post-call summary when the browser closes unexpectedly.
 *
 * Called from `handleBrowserClose` in relay.ts when the relay enters detached mode.
 * WS is already closed — summary is persisted to Firestore for the /summary page to fetch.
 *
 * Extracted from relay.ts to keep that file under 350 LOC.
 */
export async function generateBrowserCloseSummary(state: BrowserCloseStateRef, duration: number): Promise<void> {
  const sessionId = state.sessionId;
  if (!sessionId) return;

  const inputText = state.inputTranscripts.join(' ').trim();
  const outputText = state.outputTranscripts.join(' ').trim();

  // Skip if no meaningful transcript to summarize
  if (!outputText && !inputText) {
    logger.info(
      { event: 'summary_skipped_no_transcript', sessionId },
      'No transcript to summarize on browser close',
    );
    return;
  }

  try {
    const summary = await generatePostCallSummary({
      characterName: state.characterName,
      historicalSetting: state.historicalSetting,
      inputTranscript: inputText,
      outputTranscript: outputText,
    });
    logger.info(
      { event: 'summary_generated_on_close', sessionId },
      'Post-call summary generated after browser close',
    );

    void onSessionEnd({
      studentId: state.studentId,
      characterName: state.characterName,
      historicalSetting: state.historicalSetting,
      duration,
      summary,
      scenarioId: state.scenarioId,
    });

    void updateSession(sessionId, {
      status: 'ended',
      endedAt: new Date(),
      durationMs: duration * 1000,
      summary,
    });
  } catch (err) {
    logger.error(
      {
        event: 'summary_failed_on_close',
        code: 'RELAY_SUMMARY_002',
        err,
        sessionId,
        action: 'Firestore will not have a summary for this session',
      },
      'Post-call summary failed after browser close',
    );
  }
}
