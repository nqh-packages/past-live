/**
 * @what - Transcript text sanitizer for Gemini Live transcription artifacts
 * @why - Gemini leaks noise tokens and internal reasoning into transcriptions
 * @exports - sanitizeTranscript
 */

const NOISE_PATTERN = /<noise>|\[noise\]|<unk>|\[unk\]/gi;

const THINKING_PREFIXES = [
  'i need to',
  'let me',
  'i should',
  'locating',
  'searching',
  'processing',
];

export function sanitizeTranscript(text: string): string {
  let cleaned = text.replace(NOISE_PATTERN, ' ');

  cleaned = cleaned
    .split('\n')
    .filter((line) => {
      const lower = line.trim().toLowerCase();
      return !THINKING_PREFIXES.some((prefix) => lower.startsWith(prefix));
    })
    .join('\n');

  return cleaned.replace(/\s{2,}/g, ' ').trim();
}
