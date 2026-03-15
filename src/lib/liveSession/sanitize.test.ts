/**
 * @what - Tests for transcript text sanitization
 * @why - Gemini leaks noise tokens and reasoning text into transcriptions
 */

import { describe, it, expect } from 'vitest';
import { sanitizeTranscript } from './sanitize';

describe('sanitizeTranscript', () => {
  it('strips <noise> markers', () => {
    expect(sanitizeTranscript('Hello <noise> world')).toBe('Hello world');
  });

  it('strips [noise] markers', () => {
    expect(sanitizeTranscript('The walls [noise] are falling')).toBe('The walls are falling');
  });

  it('strips <unk> tokens', () => {
    expect(sanitizeTranscript('They dragged <unk> 72 ships')).toBe('They dragged 72 ships');
  });

  it('strips [unk] tokens', () => {
    expect(sanitizeTranscript('Over [unk] the mountain')).toBe('Over the mountain');
  });

  it('strips thinking text lines', () => {
    expect(sanitizeTranscript('I need to find the right response')).toBe('');
    expect(sanitizeTranscript('Let me think about that')).toBe('');
    expect(sanitizeTranscript('I should mention the siege')).toBe('');
    expect(sanitizeTranscript('Locating relevant information')).toBe('');
    expect(sanitizeTranscript('Searching for details')).toBe('');
    expect(sanitizeTranscript('Processing the request')).toBe('');
  });

  it('preserves normal speech', () => {
    const text = 'The harbor is breached. I have 300 men.';
    expect(sanitizeTranscript(text)).toBe(text);
  });

  it('handles mixed noise and speech', () => {
    expect(sanitizeTranscript('<noise> The walls are falling [noise]')).toBe('The walls are falling');
  });

  it('returns empty string for noise-only input', () => {
    expect(sanitizeTranscript('<noise> [unk] <noise>')).toBe('');
  });

  it('trims whitespace', () => {
    expect(sanitizeTranscript('  Hello world  ')).toBe('Hello world');
  });

  it('collapses multiple spaces from stripped tokens', () => {
    expect(sanitizeTranscript('Hello  <noise>  world')).toBe('Hello world');
  });
});
