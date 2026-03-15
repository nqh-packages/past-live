/**
 * @what - Saves call transcripts to docs/call-logs/ as markdown files
 * @why - Review character behavior, humor quality, pacing after test calls
 * @exports - logCallTranscript
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from './logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = join(__dirname, '../../docs/call-logs');

interface CallLogEntry {
  characterName: string;
  historicalSetting: string;
  voiceName?: string;
  systemPrompt: string;
  outputTranscripts: string[];
  inputTranscripts: string[];
  timeline: { ts: number; event: string; detail?: string }[];
  duration: number;
  reason: string;
}

/**
 * Saves a call transcript as a timestamped markdown file.
 * Fire-and-forget — errors are logged but never thrown.
 */
export function logCallTranscript(entry: CallLogEntry): void {
  logger.info(
    {
      event: 'call_log_write_start',
      characterName: entry.characterName,
      historicalSetting: entry.historicalSetting,
      duration: entry.duration,
      reason: entry.reason,
      outputSegments: entry.outputTranscripts.length,
      inputSegments: entry.inputTranscripts.length,
      timelineEvents: entry.timeline.length,
    },
    'Writing call transcript to disk',
  );

  try {
    mkdirSync(LOG_DIR, { recursive: true });

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const slug = entry.characterName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const filename = `${timestamp}-${slug}.md`;

    const content = `# Call Log: ${entry.characterName}

| Field | Value |
|-------|-------|
| Character | ${entry.characterName} |
| Setting | ${entry.historicalSetting} |
| Voice | ${entry.voiceName ?? 'default'} |
| Duration | ${entry.duration}s |
| End Reason | ${entry.reason} |
| Timestamp | ${now.toISOString()} |

---

## Event Timeline

${formatTimeline(entry.timeline, entry.characterName)}

---

## Full Transcript

${interleaveTranscripts(entry.outputTranscripts, entry.inputTranscripts, entry.characterName)}
`;

    const filepath = join(LOG_DIR, filename);
    writeFileSync(filepath, content, 'utf-8');

    // Save system prompt separately
    const promptFilename = `${timestamp}-${slug}-prompt.md`;
    const promptContent = `# System Prompt: ${entry.characterName}\n\n\`\`\`\n${entry.systemPrompt}\n\`\`\`\n`;
    writeFileSync(join(LOG_DIR, promptFilename), promptContent, 'utf-8');

    logger.info({ event: 'call_logged', filepath, character: entry.characterName }, 'Call transcript saved');
  } catch (err) {
    logger.error({ event: 'call_log_failed', err }, 'Failed to save call transcript');
  }
}

/**
 * Formats the event timeline as a markdown table with relative timestamps.
 */
function formatTimeline(
  timeline: { ts: number; event: string; detail?: string }[],
  characterName: string,
): string {
  if (!timeline.length) return '*No events recorded.*';

  const startTs = timeline[0].ts;
  const lines = ['| Time | Event | Detail |', '|------|-------|--------|'];

  for (const entry of timeline) {
    const elapsed = ((entry.ts - startTs) / 1000).toFixed(1);
    const event = entry.event;
    let detail = entry.detail ?? '';

    // Truncate long details
    if (detail.length > 120) detail = detail.slice(0, 120) + '...';
    // Escape pipes for markdown table
    detail = detail.replace(/\|/g, '\\|').replace(/\n/g, ' ');

    lines.push(`| ${elapsed}s | ${event} | ${detail} |`);
  }

  return lines.join('\n');
}

/**
 * Concatenates all transcript fragments into a readable conversation.
 * Outputs and inputs arrive as small fragments — join them into continuous text blocks.
 */
function interleaveTranscripts(
  outputs: string[],
  inputs: string[],
  characterName: string,
): string {
  const outputText = outputs.join('').trim();
  const inputText = inputs.join('').trim();

  const lines: string[] = [];

  if (outputText) {
    lines.push(`**[${characterName}]**`);
    lines.push(outputText);
    lines.push('');
  }

  if (inputText) {
    lines.push(`**[YOU]**`);
    lines.push(inputText);
    lines.push('');
  }

  return lines.join('\n') || '*No transcript captured.*';
}
