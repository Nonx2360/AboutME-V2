import type { IncomingMessage, ServerResponse } from 'http';
import { parseTTMLContent, LRCParser } from '@braccato/parsers';
import type { Lyric } from '@braccato/types';

let isJapanese: (text: string) => boolean = () => false;
let getRomaji: (text: string) => Promise<string | null> = async () => null;

try {
  const romaji = await import('./romaji');
  isJapanese = romaji.isJapanese;
  getRomaji = romaji.getRomaji;
} catch {
  console.warn('[lyrics] romaji module unavailable, skipping romaji enrichment');
}

interface VercelRequest extends IncomingMessage {
  query?: Record<string, string>;
}

interface VercelResponse extends ServerResponse {
  status(code: number): VercelResponse;
  json(data: unknown): VercelResponse;
  send(data: unknown): VercelResponse;
}

interface LrcLibResponse {
  syncedLyrics?: string;
  plainLyrics?: string;
}

interface UnisonLyricsEntry {
  lyrics: string;
  format: 'ttml' | 'lrc' | 'plain';
  syncType: string;
  confidence: number;
  song?: string;
  artist?: string;
}

type LyricsResponse = {
  source: 'unison' | 'betterlyrics' | 'lrclib' | 'none';
  synced: boolean;
  lines: Lyric[];
};

const cache = new Map<string, LyricsResponse>();

const UNISON_BASE = 'https://unison.boidu.dev';
const BETTERLYRICS_BASE = 'https://api.betterlyrics.org';

/* -- LRC Parser -------------------------------------------------------- */

/** Braccato's LRC parser also runs its word-timing fixers. */
function parseLrc(lrc: string, durationMs: number): Lyric[] {
  if (!lrc) return [];
  return LRCParser.parse(lrc, durationMs);
}

/* -- TTML Parser ------------------------------------------------------- */

/**
 * Braccato handles every timestamp shape the providers emit (`hh:mm:ss.mmm`,
 * `m:ss.mmm` and bare seconds), plus background vocals, vocalists,
 * transliterations and instrumental gaps.
 */
function parseTtml(xml: string, durationMs: number): Lyric[] {
  const { lyrics } = parseTTMLContent(xml, { songDurationMs: durationMs });
  return lyrics;
}

/* -- Unison ------------------------------------------------------------ */

async function fetchFromUnison(
  song: string,
  artist: string,
  album: string,
  durationMs: number
): Promise<LyricsResponse | null> {
  try {
    const params = new URLSearchParams({ song, artist });
    if (album) params.set('album', album);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${UNISON_BASE}/lyrics/search?${params}`, {
      headers: { 'User-Agent': 'AboutMeLiveLyrics/2.0 (https://github.com/nonx2360/AboutME-V2)' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const body = await res.json() as { success: boolean; data?: UnisonLyricsEntry[] };
    if (!body.success || !body.data || body.data.length === 0) return null;

    const entry = body.data[0];
    if (!entry.lyrics) return null;

    const lines =
      entry.format === 'ttml' ? parseTtml(entry.lyrics, durationMs) :
      entry.format === 'lrc'  ? parseLrc(entry.lyrics, durationMs)  :
      [];

    if (lines.length === 0) return null;

    return {
      source: 'unison',
      synced: true,
      lines,
    };
  } catch (err) {
    console.error('[lyrics] Unison fetch failed:', err);
    return null;
  }
}

/* -- BetterLyrics ------------------------------------------------------ */

/**
 * BetterLyrics serves syllable-synced TTML. Access is cache-first: cached
 * songs are free and keyless, while an uncached query returns 401 unless an
 * optional API key is supplied (keys are currently not being issued).
 *
 * All four params must be sent because album + duration are part of the
 * remote cache key - omitting them causes cache misses, not matches.
 */
async function fetchFromBetterLyrics(
  song: string,
  artist: string,
  album: string,
  durationMs: string
): Promise<LyricsResponse | null> {
  try {
    const durationSec = durationMs ? Math.round(parseInt(durationMs, 10) / 1000) : 0;
    const params = new URLSearchParams({ s: song, a: artist, al: album });
    if (durationSec > 0) params.set('d', durationSec.toString());

    const headers: Record<string, string> = {
      'User-Agent': 'AboutMeLiveLyrics/2.0 (https://github.com/nonx2360/AboutME-V2)',
    };
    const apiKey = process.env.BETTERLYRICS_API_KEY;
    if (apiKey) headers['X-API-Key'] = apiKey;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${BETTERLYRICS_BASE}/getLyrics?${params}`, {
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    // 401 = uncached without key, 404 = no lyrics, 429 = rate limited.
    // All are non-fatal: the caller simply falls through to the next provider.
    if (!res.ok) return null;

    const body = await res.json() as { ttml?: string };
    if (!body.ttml) return null;

    const lines = parseTtml(body.ttml, durationSec * 1000);
    if (lines.length === 0) return null;

    return { source: 'betterlyrics', synced: true, lines };
  } catch (err) {
    console.error('[lyrics] BetterLyrics fetch failed:', err);
    return null;
  }
}

/* -- LRCLIB ------------------------------------------------------------ */

async function fetchFromLrclib(
  track: string,
  artist: string,
  album: string,
  durationMs: string
): Promise<LyricsResponse | null> {
  try {
    const durationSec = durationMs ? Math.round(parseInt(durationMs, 10) / 1000) : 0;
    const params = new URLSearchParams();
    if (track) params.set('track_name', track);
    if (artist) params.set('artist_name', artist);
    if (album) params.set('album_name', album);
    if (durationSec) params.set('duration', durationSec.toString());

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`https://lrclib.net/api/get?${params}`, {
      headers: { 'User-Agent': 'AboutMeLiveLyrics/2.0 (https://github.com/nonx2360/AboutME-V2)' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = (await res.json()) as LrcLibResponse;
    if (!data.syncedLyrics) return null;

    const lines = parseLrc(data.syncedLyrics, durationSec * 1000);
    if (lines.length === 0) return null;

    return { source: 'lrclib', synced: true, lines };
  } catch (err) {
    console.error('[lyrics] LRCLIB fetch failed:', err);
    return null;
  }
}

/* -- Romaji Enrichment ------------------------------------------------- */

async function enrichWithRomaji(lines: Lyric[]): Promise<Lyric[]> {
  try {
    // Skip synthetic instrumental lines - they have no text to convert.
    const jpLines = lines.filter(l => !l.isInstrumental && isJapanese(l.words));
    if (jpLines.length === 0) return lines;

    return await Promise.all(
      lines.map(async (line) => {
        if (line.isInstrumental) return line;
        const romaji = await getRomaji(line.words);
        // Only fill the gap; a TTML document can already carry a romanization.
        if (!romaji || line.romanization) return line;
        return { ...line, romanization: romaji };
      })
    );
  } catch (err) {
    console.error('[lyrics] enrichWithRomaji failed:', err);
    return lines;
  }
}

/* -- Handler ----------------------------------------------------------- */

const EMPTY: LyricsResponse = { source: 'none', synced: false, lines: [] };

/** Enriches with romaji, caches, and writes the response. */
async function respondWith(
  res: VercelResponse,
  trackId: string,
  result: LyricsResponse
): Promise<LyricsResponse> {
  const payload: LyricsResponse = {
    ...result,
    lines: await enrichWithRomaji(result.lines),
  };
  cache.set(trackId, payload);
  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=600');
  res.status(200).json(payload);
  return payload;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    let { artist, track, album, durationMs, trackId } = req.query || {};

    if (!trackId) {
      try {
        const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
        artist = url.searchParams.get('artist') || '';
        track = url.searchParams.get('track') || '';
        album = url.searchParams.get('album') || '';
        durationMs = url.searchParams.get('durationMs') || '';
        trackId = url.searchParams.get('trackId') || '';
      } catch {
        return res.status(400).json({ error: 'Invalid URL parameters' });
      }
    }

    if (!trackId) {
      return res.status(400).json({ error: 'Missing trackId' });
    }

    if (cache.has(trackId)) {
      res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=600');
      return res.status(200).json(cache.get(trackId));
    }

    // Duration in ms drives the parsers' instrumental-gap detection.
    const totalMs = durationMs ? parseInt(durationMs, 10) || 0 : 0;

    // 1. Try Unison TTML first
    const unisonResult = track && artist
      ? await fetchFromUnison(track, artist, album || '', totalMs)
      : null;

    if (unisonResult) {
      return respondWith(res, trackId, unisonResult);
    }

    // 2. Fall back to BetterLyrics - also TTML, so real word timing is preserved
    const betterLyricsResult = track && artist
      ? await fetchFromBetterLyrics(track, artist, album || '', durationMs || '')
      : null;

    if (betterLyricsResult) {
      return respondWith(res, trackId, betterLyricsResult);
    }

    // 3. Last resort: LRCLIB (line-level LRC, word timing interpolated)
    const lrclibResult = await fetchFromLrclib(track || '', artist || '', album || '', durationMs || '');

    if (lrclibResult) {
      return respondWith(res, trackId, lrclibResult);
    }

    cache.set(trackId, EMPTY);
    return res.status(200).json(EMPTY);
  } catch (error: unknown) {
    console.error('[lyrics] handler error:', error);
    return res.status(200).json(EMPTY);
  }
}

