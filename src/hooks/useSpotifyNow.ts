import { useEffect, useState, useRef } from 'react';
import type { NowPlayingTrack } from '../types/spotify';

export function useSpotifyNow() {
  const [data, setData] = useState<NowPlayingTrack | null>(null);
  const [displayProgressMs, setDisplayProgressMs] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const lastValidTrackRef = useRef<NowPlayingTrack | null>(null);
  /**
   * Highest progress this hook has shown for the current track. Playback never
   * runs backwards, and neither should the clock we hand the renderer: a poll
   * whose reported progress lags the local tick would otherwise rewind it and
   * make already-sung words flip back and replay their highlight.
   */
  const highWaterRef = useRef<number>(0);
  const trackIdRef = useRef<string>('');

  const fetchData = async (isFirstFetch = false) => {
    try {
      if (isFirstFetch) setLoading(true);
      const res = await fetch('/api/spotify-now');
      if (!res.ok) {
        // Parse error response if possible
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch Spotify now playing status');
      }
      const track: NowPlayingTrack = await res.json();
      
      setData(track);
      if (track && track.isPlaying) {
        lastValidTrackRef.current = track;
      }
    } catch (error: unknown) {
      console.error('Error fetching Spotify now playing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Spotify connection error';
      setData(prev => ({
        isPlaying: false,
        progressMs: 0,
        durationMs: 0,
        fetchedAt: Date.now(),
        trackId: '',
        song: '',
        artist: '',
        album: '',
        albumArtUrl: '',
        spotifyUrl: '',
        error: errorMessage,
        ...prev, // Keep previous data structure if we had one
      }));
    } finally {
      setLoading(false);
    }
  };

  // Poll Spotify status
  useEffect(() => {
    fetchData(true);

    const interval = setInterval(() => {
      // Reduce polling when document is hidden
      if (document.visibilityState === 'visible') {
        fetchData(false);
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Sync displayProgressMs with fetchedAt and local ticking
  useEffect(() => {
    if (!data) return;

    if (!data.isPlaying) {
      setDisplayProgressMs(data.progressMs);
      return;
    }

    // A different track restarts the clock from zero; seeking or looping the
    // same track is not something the API exposes, so treat one trackId as
    // one continuous playthrough.
    if (trackIdRef.current !== data.trackId) {
      trackIdRef.current = data.trackId;
      highWaterRef.current = 0;
    }

    // Set initial display progress with network/processing delay offset
    const initialOffset = Date.now() - data.fetchedAt;
    const reported = data.progressMs + initialOffset;

    // Never rewind: a fresh poll can report a progress_ms that sits behind the
    // local clock, because Spotify's value is quantized and sampled when the
    // request was made. Rewinding makes words flip back from "sung" to
    // "unsung" and replay their highlight animation, which reads as a blink.
    const startProgress = Math.min(data.durationMs, Math.max(reported, highWaterRef.current));
    highWaterRef.current = startProgress;
    setDisplayProgressMs(startProgress);

    // Tick progress smoothly at 60fps using requestAnimationFrame (SLG style)
    let rafId: number;
    const tick = () => {
      const offset = Date.now() - data.fetchedAt;
      const currentProgress = data.progressMs + offset;

      if (currentProgress >= data.durationMs) {
        setDisplayProgressMs(data.durationMs);
        fetchData(false);
      } else {
        const next = Math.min(
          data.durationMs,
          Math.max(currentProgress, highWaterRef.current)
        );
        highWaterRef.current = next;
        setDisplayProgressMs(next);
        rafId = requestAnimationFrame(tick);
      }
    };
    rafId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafId);
  }, [data]);

  // Refetch immediately when tab regains visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return {
    data,
    displayProgressMs,
    loading,
    lastValidTrack: lastValidTrackRef.current,
  };
}
