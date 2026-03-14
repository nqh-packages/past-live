/**
 * @what - Lazy singleton GoogleGenAI client for Flash JSON/image calls
 * @why - Three modules (session-preview, extract-topic, post-call-summary) share the same client pattern. Extracting prevents duplication and ensures a single instance.
 * @exports - getAI
 */

import { GoogleGenAI } from '@google/genai';

// ─── Singleton ────────────────────────────────────────────────────────────────

let _ai: GoogleGenAI | null = null;

/**
 * Returns the shared GoogleGenAI singleton.
 * Reads GEMINI_API_KEY from process.env on first call.
 * Subsequent calls return the same instance — safe to call from hot paths.
 *
 * @pitfall - Does NOT use v1alpha. gemini.ts keeps its own client for the Live
 *   API (v1alpha required for enableAffectiveDialog). Do NOT replace that one.
 */
export function getAI(): GoogleGenAI {
  if (!_ai) {
    _ai = new GoogleGenAI({ apiKey: process.env['GEMINI_API_KEY'] ?? '' });
  }
  return _ai;
}
