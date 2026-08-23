import type { IncomingMessage, ServerResponse } from 'http';
import { getRomaji, isJapanese } from './romaji';

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

type SyncedLyricLine = {
  timeMs: number;
  text: string;
  /** Hepburn Romaji — populated for Japanese lines, null otherwise. */
  romaji?: string | null;
};

type LyricsResponse = {
  source: 'lrclib' | 'local' | 'none';
  synced: boolean;
  lines: SyncedLyricLine[];
  /** True if any line in this track has Japanese content (for client-side UI decisions). */
  hasJapanese?: boolean;
};

const cache = new Map<string, LyricsResponse>();

// LRC parser
function parseLrc(lrc: string): SyncedLyricLine[] {
  if (!lrc) return [];
  const lines = lrc.split('\n');
  const result: SyncedLyricLine[] = [];
  
  // Matches [mm:ss.xx] or [mm:ss.xxx] or [mm:ss]
  const timeRegex = /\[(\d+):(\d+)(?:\.(\d+))?\]/;
  
  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const millisecondsStr = match[3] || '0';
      const msVal = parseInt(millisecondsStr.padEnd(3, '0').slice(0, 3), 10);
      
      const timeMs = (minutes * 60 + seconds) * 1000 + msVal;
      const text = line.replace(timeRegex, '').trim();
      
      // Filter out metadata tags like [ar: artist], [ti: title], etc.
      if (text || line.trim().endsWith(']')) {
        result.push({ timeMs, text });
      }
    }
  }
  
  return result.sort((a, b) => a.timeMs - b.timeMs);
}

/**
 * Enriches parsed lyric lines with server-side Romaji for Japanese lines.
 * Non-Japanese lines get `romaji: null` — no extra processing cost.
 * Runs concurrently for all lines to minimise latency.
 */
async function enrichWithRomaji(lines: SyncedLyricLine[]): Promise<{ enriched: SyncedLyricLine[]; hasJapanese: boolean }> {
  const jpLines = lines.filter(l => isJapanese(l.text));

  // Short-circuit for non-JP tracks — skip kuroshiro init entirely
  if (jpLines.length === 0) {
    return { enriched: lines.map(l => ({ ...l, romaji: null })), hasJapanese: false };
  }

  // Convert all JP lines concurrently
  const romajiResults = await Promise.all(
    lines.map(async (line) => {
      const romaji = await getRomaji(line.text);
      return { ...line, romaji };
    })
  );

  return { enriched: romajiResults, hasJapanese: true };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow CORS
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

  // Parse query parameters from request url if not parsed by Vercel
  let { artist, track, album, durationMs, trackId } = req.query || {};

  if (!trackId) {
    // If query is not parsed (local dev proxy), parse from URL
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

  // 1. Check cache first (already enriched with romaji)
  if (cache.has(trackId)) {
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=600');
    return res.status(200).json(cache.get(trackId));
  }

  // 2. Local fallback if configured (e.g. for specific debug trackIds)
  const localLyrics: string | null = null;
  if (localLyrics) {
    const rawLines = parseLrc(localLyrics);
    const { enriched, hasJapanese } = await enrichWithRomaji(rawLines);
    const result: LyricsResponse = { source: 'local', synced: true, lines: enriched, hasJapanese };
    cache.set(trackId, result);
    return res.status(200).json(result);
  }

  // 3. Fetch from LRCLIB
  try {
    const durationSec = durationMs ? Math.round(parseInt(durationMs, 10) / 1000) : 0;
    
    const searchParams = new URLSearchParams();
    if (track) searchParams.set('track_name', track);
    if (artist) searchParams.set('artist_name', artist);
    if (album) searchParams.set('album_name', album);
    if (durationSec) searchParams.set('duration', durationSec.toString());

    const url = `https://lrclib.net/api/get?${searchParams.toString()}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AboutMeLiveLyrics/1.0.0 (https://github.com/nonx2360/AboutME-V2)',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        const result: LyricsResponse = { source: 'none', synced: false, lines: [], hasJapanese: false };
        cache.set(trackId, result);
        return res.status(200).json(result);
      }
      throw new Error(`LRCLIB error: ${response.statusText}`);
    }

    const data = (await response.json()) as LrcLibResponse;
    
    if (data.syncedLyrics) {
      const rawLines = parseLrc(data.syncedLyrics);
      const { enriched, hasJapanese } = await enrichWithRomaji(rawLines);
      const result: LyricsResponse = { source: 'lrclib', synced: true, lines: enriched, hasJapanese };
      cache.set(trackId, result);
      res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=600');
      return res.status(200).json(result);
    } else if (data.plainLyrics) {
      // Unsynced fallback
      const result: LyricsResponse = { source: 'lrclib', synced: false, lines: [], hasJapanese: false };
      cache.set(trackId, result);
      return res.status(200).json(result);
    } else {
      const result: LyricsResponse = { source: 'none', synced: false, lines: [], hasJapanese: false };
      cache.set(trackId, result);
      return res.status(200).json(result);
    }
  } catch (error: unknown) {
    console.error('Error fetching lyrics from LRCLIB:', error);
    return res.status(200).json({ source: 'none', synced: false, lines: [], hasJapanese: false });
  }
}
