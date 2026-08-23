/**
 * Client-side Japanese detection utility.
 *
 * NOTE: Actual Romaji conversion is done server-side via kuroshiro in /api/lyrics.ts.
 * This module only exposes the detection helper for any client-side guards (e.g. fallback UI).
 */

/** Matches Hiragana, Katakana, and common Kanji Unicode ranges. */
const JP_REGEX = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/;

/** Returns true if the string contains Japanese characters. */
export function isJapanese(text: string): boolean {
  return JP_REGEX.test(text);
}
