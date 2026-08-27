import type { IncomingMessage, ServerResponse } from 'http';

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

type SyncedLyricWord = {
  timeMs: number;
  endMs: number;
  text: string;
};

type SyncedLyricLine = {
  timeMs: number;
  text: string;
  romaji?: string | null;
  words?: SyncedLyricWord[];
};

type LyricsResponse = {
  source: 'unison' | 'lrclib' | 'none';
  synced: boolean;
  lines: SyncedLyricLine[];
  hasJapanese?: boolean;
};

const cache = new Map<string, LyricsResponse>();

const UNISON_BASE = 'https://unison.boidu.dev';

/* ── LRC Parser ──────────────────────────────────────────────────────── */

function parseLrc(lrc: string): SyncedLyricLine[] {
  if (!lrc) return [];
  const timeRegex = /\[(\d+):(\d+)(?:\.(\d+))?\]/;

  // First pass: extract raw timed lines
  const raw: { timeMs: number; text: string }[] = [];
  for (const line of lrc.split('\n')) {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const msStr = match[3] || '0';
      const ms = parseInt(msStr.padEnd(3, '0').slice(0, 3), 10);
      const timeMs = (minutes * 60 + seconds) * 1000 + ms;
      const text = line.replace(timeRegex, '').trim();
      if (text) raw.push({ timeMs, text });
    }
  }
  raw.sort((a, b) => a.timeMs - b.timeMs);

  // Second pass: build lines with approximate word timing
  return raw.map((entry, i) => {
    const nextStart = i < raw.length - 1 ? raw[i + 1].timeMs : entry.timeMs + 3000;
    const words = distributeWords(entry.text, entry.timeMs, nextStart);
    return { timeMs: entry.timeMs, text: entry.text, words };
  });
}

function distributeWords(text: string, startMs: number, endMs: number): SyncedLyricWord[] {
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return [{ timeMs: startMs, endMs, text }];

  const totalChars = parts.reduce((sum, w) => sum + w.length, 0);
  const duration = endMs - startMs;
  let cursor = startMs;

  return parts.map((word) => {
    const wordMs = cursor;
    const wordEnd = cursor + (word.length / totalChars) * duration;
    cursor = wordEnd;
    return { timeMs: wordMs, endMs: wordEnd, text: word };
  });
}

/* ── TTML Parser ─────────────────────────────────────────────────────── */

function parseTtmlTimestamp(ts: string): number {
  if (!ts) return 0;
  const m = ts.match(/(?:(\d+):)?(\d+):(\d+(?:\.\d+)?)/);
  if (!m) return 0;
  const hours = parseInt(m[1] || '0', 10);
  const minutes = parseInt(m[2], 10);
  const seconds = parseFloat(m[3]);
  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

function parseTtml(xml: string): SyncedLyricLine[] {
  const lines: SyncedLyricLine[] = [];

  // Try word-level: <p> containing <span begin="..." end="...">word</span>
  const paraRegex = /<p[^>]*begin="([^"]*)"[^>]*>([\s\S]*?)<\/p>/g;
  let paraMatch;
  while ((paraMatch = paraRegex.exec(xml)) !== null) {
    const pBegin = parseTtmlTimestamp(paraMatch[1]);
    const pContent = paraMatch[2];

    // Extract words from spans inside this <p>
    const wordRegex = /<span[^>]*begin="([^"]*)"[^>]*end="([^"]*)"[^>]*>([^<]+)<\/span>/g;
    const words: SyncedLyricWord[] = [];
    let wMatch;
    while ((wMatch = wordRegex.exec(pContent)) !== null) {
      const text = wMatch[3].trim();
      if (text) words.push({ timeMs: parseTtmlTimestamp(wMatch[1]), endMs: parseTtmlTimestamp(wMatch[2]), text });
    }

    const fullText = pContent.replace(/<[^>]+>/g, '').trim();
    if (!fullText) continue;

    if (words.length > 1) {
      // Word-level line
      lines.push({ timeMs: pBegin, text: fullText, words });
    } else {
      // Line-level only
      lines.push({ timeMs: pBegin, text: fullText });
    }
  }

  if (lines.length > 0) return lines.sort((a, b) => a.timeMs - b.timeMs);

  // Fallback: plain <p begin="...">text</p> without spans
  const plainParaRegex = /<p[^>]*begin="([^"]*)"[^>]*>([\s\S]*?)<\/p>/g;
  while ((paraMatch = plainParaRegex.exec(xml)) !== null) {
    const text = paraMatch[2].replace(/<[^>]+>/g, '').trim();
    if (text) lines.push({ timeMs: parseTtmlTimestamp(paraMatch[1]), text });
  }

  return lines.sort((a, b) => a.timeMs - b.timeMs);
}

/* ── Unison ──────────────────────────────────────────────────────────── */

async function fetchFromUnison(
  song: string,
  artist: string,
  album: string
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
      entry.format === 'ttml' ? parseTtml(entry.lyrics) :
      entry.format === 'lrc'  ? parseLrc(entry.lyrics)  :
      [];

    if (lines.length === 0) return null;

    return {
      source: 'unison',
      synced: true,
      lines,
      hasJapanese: false,
    };
  } catch (err) {
    console.error('[lyrics] Unison fetch failed:', err);
    return null;
  }
}

/* ── LRCLIB ──────────────────────────────────────────────────────────── */

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

    const lines = parseLrc(data.syncedLyrics);
    if (lines.length === 0) return null;

    return { source: 'lrclib', synced: true, lines, hasJapanese: false };
  } catch (err) {
    console.error('[lyrics] LRCLIB fetch failed:', err);
    return null;
  }
}

/* ── Romaji Enrichment ───────────────────────────────────────────────── */

async function enrichWithRomaji(
  lines: SyncedLyricLine[]
): Promise<{ enriched: SyncedLyricLine[]; hasJapanese: boolean }> {
  try {
    const jpLines = lines.filter(l => isJapanese(l.text));
    if (jpLines.length === 0) {
      return { enriched: lines.map(l => ({ ...l, romaji: null })), hasJapanese: false };
    }

    const enriched = await Promise.all(
      lines.map(async (line) => ({
        ...line,
        romaji: await getRomaji(line.text),
      }))
    );

    return { enriched, hasJapanese: true };
  } catch (err) {
    console.error('[lyrics] enrichWithRomaji failed:', err);
    return { enriched: lines.map(l => ({ ...l, romaji: null })), hasJapanese: false };
  }
}

/* ── Handler ─────────────────────────────────────────────────────────── */

const EMPTY: LyricsResponse = { source: 'none', synced: false, lines: [], hasJapanese: false };

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

    // 1. Try Unison TTML first
    const unisonResult = track && artist
      ? await fetchFromUnison(track, artist, album || '')
      : null;

    if (unisonResult) {
      const { enriched, hasJapanese } = await enrichWithRomaji(unisonResult.lines);
      const result: LyricsResponse = { ...unisonResult, lines: enriched, hasJapanese };
      cache.set(trackId, result);
      res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=600');
      return res.status(200).json(result);
    }

    // 2. Fallback to LRCLIB
    const lrclibResult = await fetchFromLrclib(track || '', artist || '', album || '', durationMs || '');

    if (lrclibResult) {
      const { enriched, hasJapanese } = await enrichWithRomaji(lrclibResult.lines);
      const result: LyricsResponse = { ...lrclibResult, lines: enriched, hasJapanese };
      cache.set(trackId, result);
      res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=600');
      return res.status(200).json(result);
    }

    cache.set(trackId, EMPTY);
    return res.status(200).json(EMPTY);
  } catch (error: unknown) {
    console.error('[lyrics] handler error:', error);
    return res.status(200).json(EMPTY);
  }
}
