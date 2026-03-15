/**
 * @what - Tests for transcript pacing + input turn tracking
 * @why - Output text arrives 4-5x faster than audio; input text is cumulative and must not duplicate
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  enqueueWords,
  flushAll,
  clearPacer,
  getPendingCount,
  setPacerCallback,
  resetPacer,
} from './transcript-pacer';
import {
  handleInputTranscription,
  finalizeInputTurn,
  getInputTranscript,
  resetInputTracking,
} from './transcript-pacer';

// ─── Input Transcript Accumulation ──────────────────────────────────────────

describe('Input transcript tracking', () => {
  beforeEach(() => {
    resetInputTracking();
  });

  it('stores cumulative text without duplication', () => {
    handleInputTranscription('How');
    handleInputTranscription('How did');
    handleInputTranscription('How did the walls fall');
    expect(getInputTranscript()).toBe('How did the walls fall');
  });

  it('accumulates across finalized turns', () => {
    handleInputTranscription('How');
    handleInputTranscription('How did the walls fall');
    finalizeInputTurn();
    handleInputTranscription('Tell');
    handleInputTranscription('Tell me more');
    expect(getInputTranscript()).toBe('How did the walls fall Tell me more');
  });

  it('finalizeInputTurn is idempotent when no input', () => {
    finalizeInputTurn();
    finalizeInputTurn();
    expect(getInputTranscript()).toBe('');
  });

  it('handles three turns correctly', () => {
    handleInputTranscription('First turn');
    finalizeInputTurn();
    handleInputTranscription('Second');
    handleInputTranscription('Second turn');
    finalizeInputTurn();
    handleInputTranscription('Third');
    expect(getInputTranscript()).toBe('First turn Second turn Third');
  });

  it('resetInputTracking clears everything', () => {
    handleInputTranscription('Something');
    finalizeInputTurn();
    handleInputTranscription('More');
    resetInputTracking();
    expect(getInputTranscript()).toBe('');
  });
});

// ─── Output Transcript Pacer ────────────────────────────────────────────────

describe('Transcript pacer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetPacer();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetPacer();
  });

  it('enqueueWords splits text into word queue', () => {
    enqueueWords('The walls are falling');
    expect(getPendingCount()).toBe(4);
  });

  it('drip callback fires at interval with one word', () => {
    const words: string[] = [];
    setPacerCallback((w) => words.push(w));
    enqueueWords('Hello world');

    vi.advanceTimersByTime(435);
    expect(words).toEqual(['Hello']);

    vi.advanceTimersByTime(435);
    expect(words).toEqual(['Hello', 'world']);
  });

  it('flushAll reveals all remaining words at once', () => {
    const words: string[] = [];
    setPacerCallback((w) => words.push(w));
    enqueueWords('One two three four five');

    vi.advanceTimersByTime(435); // drip "One"
    flushAll();
    expect(words).toEqual(['One', 'two three four five']);
  });

  it('clearPacer empties queue and stops timer', () => {
    const words: string[] = [];
    setPacerCallback((w) => words.push(w));
    enqueueWords('Hello world');

    clearPacer();
    vi.advanceTimersByTime(5000);
    expect(words).toEqual([]);
    expect(getPendingCount()).toBe(0);
  });

  it('empty text does not start drip', () => {
    const words: string[] = [];
    setPacerCallback((w) => words.push(w));
    enqueueWords('');
    enqueueWords('   ');

    vi.advanceTimersByTime(5000);
    expect(words).toEqual([]);
  });

  it('multiple enqueue calls accumulate', () => {
    const words: string[] = [];
    setPacerCallback((w) => words.push(w));
    enqueueWords('Hello');
    enqueueWords('world');

    expect(getPendingCount()).toBe(2);
    vi.advanceTimersByTime(870); // 2 × 435ms
    expect(words).toEqual(['Hello', 'world']);
  });

  it('stops drip timer when queue empties', () => {
    const words: string[] = [];
    setPacerCallback((w) => words.push(w));
    enqueueWords('Hi');

    vi.advanceTimersByTime(435);
    expect(words).toEqual(['Hi']);

    // Timer should have stopped — no more callbacks
    vi.advanceTimersByTime(5000);
    expect(words).toEqual(['Hi']);
  });
});
