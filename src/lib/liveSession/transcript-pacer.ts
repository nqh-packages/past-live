/**
 * @what - Paced output transcript reveal + correct input transcript accumulation
 * @why - Output text arrives 4-5x faster than audio (138 WPM, 435ms/word).
 *   Input transcription arrives as deltas (word fragments) and must be accumulated per turn.
 * @exports - enqueueWords, flushAll, clearPacer, getPendingCount, setPacerCallback, resetPacer,
 *            handleInputTranscription, finalizeInputTurn, getInputTranscript, resetInputTracking
 */

// ─── Output Pacer ──────────────────────────────────────────────────────────

/** 138 WPM = 2.3 words/sec = ~435ms per word */
const MS_PER_WORD = 435;

let pendingWords: string[] = [];
let dripTimer: ReturnType<typeof setInterval> | null = null;
let onRevealWord: ((word: string) => void) | null = null;

export function setPacerCallback(cb: (word: string) => void): void {
  onRevealWord = cb;
}

export function enqueueWords(text: string): void {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return;
  pendingWords.push(...words);
  if (!dripTimer) startDrip();
}

function startDrip(): void {
  if (dripTimer) return;
  dripTimer = setInterval(() => {
    const word = pendingWords.shift();
    if (word) {
      onRevealWord?.(word);
    }
    if (pendingWords.length === 0) {
      stopDrip();
    }
  }, MS_PER_WORD);
}

function stopDrip(): void {
  if (dripTimer) { clearInterval(dripTimer); dripTimer = null; }
}

export function flushAll(): void {
  if (pendingWords.length > 0) {
    const remaining = pendingWords.join(' ');
    pendingWords = [];
    onRevealWord?.(remaining);
  }
  stopDrip();
}

export function clearPacer(): void {
  pendingWords = [];
  stopDrip();
}

export function getPendingCount(): number {
  return pendingWords.length;
}

export function resetPacer(): void {
  clearPacer();
  onRevealWord = null;
}

// ─── Input Transcript Tracking ──────────────────────────────────────────────

/** Cumulative text for the current student turn */
let inputTurnText = '';
/** Joined text from all completed student turns */
let inputCompletedText = '';

/**
 * Handle an incremental input transcription event.
 * Gemini sends deltas (word fragments), not cumulative text — we append.
 */
export function handleInputTranscription(text: string): void {
  inputTurnText = inputTurnText ? `${inputTurnText}${text}` : text;
}

/**
 * Finalize the current student turn — save cumulative text and reset.
 * Call when character starts speaking (output_transcription arrives after student).
 */
export function finalizeInputTurn(): void {
  if (!inputTurnText) return;
  inputCompletedText = inputCompletedText
    ? `${inputCompletedText} ${inputTurnText}`
    : inputTurnText;
  inputTurnText = '';
}

/**
 * Get the full session input transcript (all completed turns + current partial).
 */
export function getInputTranscript(): string {
  if (!inputTurnText) return inputCompletedText;
  return inputCompletedText
    ? `${inputCompletedText} ${inputTurnText}`
    : inputTurnText;
}

export function resetInputTracking(): void {
  inputTurnText = '';
  inputCompletedText = '';
}
