import { useEffect, useState, useMemo } from 'react';
import type { LyricsResponse } from '../types/spotify';
import { findActiveLyricIndex } from '../utils/lyrics';

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

  const activeIndex = useMemo(() => {
    if (!synced || lines.length === 0) return -1;
    return findActiveLyricIndex(lines, displayProgressMs);
  }, [lines, displayProgressMs, synced]);

  const activeLine = activeIndex !== -1 ? lines[activeIndex] : null;
  const previousLine = activeIndex > 0 ? lines[activeIndex - 1] : null;
  
  const nextLine = useMemo(() => {
    if (lines.length === 0) return null;
    if (activeIndex === -1) return lines[0];
    if (activeIndex < lines.length - 1) return lines[activeIndex + 1];
    return null;
  }, [lines, activeIndex]);

  return {
    activeLine,
    previousLine,
    nextLine,
    activeIndex,
    hasSyncedLyrics: synced && lines.length > 0,
    hasJapanese: lyricsData?.hasJapanese ?? false,
    loading,
    lines,
    source: lyricsData?.source || 'none',
  };
}
