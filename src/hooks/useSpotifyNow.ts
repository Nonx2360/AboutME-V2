import { useEffect, useState, useRef } from 'react';
import type { NowPlayingTrack } from '../types/spotify';

export function useSpotifyNow() {
  const [data, setData] = useState<NowPlayingTrack | null>(null);
  const [displayProgressMs, setDisplayProgressMs] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const lastValidTrackRef = useRef<NowPlayingTrack | null>(null);

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

    // Set initial display progress with network/processing delay offset
    const initialOffset = Date.now() - data.fetchedAt;
    const startProgress = Math.min(data.durationMs, data.progressMs + initialOffset);
    setDisplayProgressMs(startProgress);

    // Tick progress smoothly locally
    const tickInterval = setInterval(() => {
      const offset = Date.now() - data.fetchedAt;
      const currentProgress = data.progressMs + offset;
      
      if (currentProgress >= data.durationMs) {
        setDisplayProgressMs(data.durationMs);
        clearInterval(tickInterval);
        // Song might have transitioned, fetch new status immediately
        fetchData(false);
      } else {
        setDisplayProgressMs(currentProgress);
      }
    }, 100); // 10 ticks per second is plenty for smooth bar & lyrics sync

    return () => clearInterval(tickInterval);
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
