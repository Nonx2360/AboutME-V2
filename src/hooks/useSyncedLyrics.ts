import { useEffect, useState, useMemo } from 'react';
import type { LyricsResponse } from '../types/spotify';

/**
 * Fetches parsed lyrics for the active track.
 *
 * Braccato owns active-line and active-word tracking, so this hook only reports
 * what the card still needs: whether synced lyrics exist, where they came from,
 * and the clock the renderer follows.
 */
export function useSyncedLyrics(
  trackId: string | undefined,
  song: string | undefined,
  artist: string | undefined,
  album: string | undefined,
  durationMs: number | undefined,
  displayProgressMs: number
) {
  const [lyricsData, setLyricsData] = useState<LyricsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!trackId || !song || !artist) {
      setLyricsData(null);
      return;
    }

    let isMounted = true;

    const fetchLyrics = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          artist: artist || '',
          track: song || '',
          album: album || '',
          durationMs: durationMs?.toString() || '0',
          trackId: trackId || '',
        });

        const res = await fetch(`/api/lyrics?${queryParams.toString()}`);
        if (!res.ok) {
          throw new Error('Lyrics fetch failed');
        }
        const data: LyricsResponse = await res.json();
        
        if (isMounted) {
          setLyricsData(data);
        }
      } catch (error) {
        console.error('Error in useSyncedLyrics:', error);
        if (isMounted) {
          setLyricsData({ source: 'none', synced: false, lines: [] });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchLyrics();

    return () => {
      isMounted = false;
    };
  }, [trackId, song, artist, album, durationMs]);

  const lines = useMemo(() => lyricsData?.lines || [], [lyricsData]);
  const synced = lyricsData?.synced || false;

  return {
    displayProgressMs,
    hasSyncedLyrics: synced && lines.length > 0,
    loading,
    lines,
    source: lyricsData?.source || 'none',
  };
}
