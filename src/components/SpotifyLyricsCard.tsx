import { useSpotifyNow } from '../hooks/useSpotifyNow';
import { useSyncedLyrics } from '../hooks/useSyncedLyrics';
import { LyricLineStack } from './LyricLineStack';
import { formatPlaybackTime } from '../utils/lyrics';
import { ExternalLink, AlertCircle, Play, Pause } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { NowPlayingTrack } from '../types/spotify';

interface LanyardSpotifyData {
  track_id: string;
  timestamps: {
    start: number;
    end: number;
  };
  song: string;
  artist: string;
  album_art_url: string;
  album: string;
}

interface SpotifyLyricsCardProps {
  lanyardSpotify: LanyardSpotifyData | null | undefined;
}

export function SpotifyLyricsCard({ lanyardSpotify }: SpotifyLyricsCardProps) {
  const { data: spotifyData, displayProgressMs, loading } = useSpotifyNow();

  // Normalize Lanyard status if available
  const lanyardNormalized = lanyardSpotify ? {
    isPlaying: true,
    progressMs: 0,
    durationMs: lanyardSpotify.timestamps.end - lanyardSpotify.timestamps.start,
    fetchedAt: 0,
    trackId: lanyardSpotify.track_id,
    song: lanyardSpotify.song,
    artist: lanyardSpotify.artist,
    album: lanyardSpotify.album,
    albumArtUrl: lanyardSpotify.album_art_url,
    spotifyUrl: `https://open.spotify.com/track/${lanyardSpotify.track_id}`,
  } : null;

  // Determine active track: Prefer local Spotify API (spotifyData) if it has a track playing/resolved, 
  // else fallback to Lanyard status, else use last valid track if loading.
  const activeTrack: NowPlayingTrack | null = (() => {
    // If the local Spotify endpoint has a valid response
    if (spotifyData) {
      if (spotifyData.isPlaying || (spotifyData.trackId && !spotifyData.error)) {
        return spotifyData;
      }
    }
    // If Lanyard has track data
    if (lanyardNormalized) {
      return lanyardNormalized;
    }
    // Fallback to local Spotify endpoint state (which might carry error info)
    return spotifyData;
  })();

  // Keep track of active progress. If using Lanyard, we tick it locally.
  const [lanyardProgressMs, setLanyardProgressMs] = useState(0);

  useEffect(() => {
    if (!lanyardSpotify) return;
    const { start, end } = lanyardSpotify.timestamps;
    const duration = end - start;
    
    const update = () => {
      const current = Math.max(0, Date.now() - start);
      setLanyardProgressMs(Math.min(duration, current));
    };
    
    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, [lanyardSpotify]);

  // Choose the source of progress tracking based on which track details we are using
  const isUsingLanyard = activeTrack && lanyardNormalized && activeTrack.trackId === lanyardNormalized.trackId;
  const activeProgressMs = isUsingLanyard ? lanyardProgressMs : displayProgressMs;

  const track = activeTrack;
  const isPlaying = track?.isPlaying || false;

  // Fetch lyrics for the active track
  const {
    activeIndex,
    activeWordIndex,
    hasSyncedLyrics,
    hasJapanese,
    loading: lyricsLoading,
    source: lyricsSource,
    lines,
  } = useSyncedLyrics(
    track?.trackId,
    track?.song,
    track?.artist,
    track?.album,
    track?.durationMs,
    activeProgressMs
  );

  // Calculate progress bar percent
  const progressPercent = track && track.durationMs > 0
    ? Math.min(100, (activeProgressMs / track.durationMs) * 100)
    : 0;

  // 1. Render Loading State (during first fetch, when no fallback is active)
  if (loading && !track && !lanyardSpotify) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[260px] w-full">
        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <div className="text-xs font-bold text-white/30 uppercase tracking-widest">Connecting to Spotify...</div>
      </div>
    );
  }

  // 2. Render Error / Missing Config State (only if no Lanyard fallback is present)
  if (track?.error && !lanyardSpotify) {
    return (
      <div className="flex flex-col justify-between h-full w-full min-h-[220px]">
        <div>
          <div className="flex items-center gap-3 text-amber-500 mb-6">
            <AlertCircle size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest">Spotify Integration</span>
          </div>
          <p className="text-sm text-white/60 leading-relaxed">
            {track.error.includes('variables') 
              ? 'Configure your Spotify credentials in your environment (.env) to enable direct OAuth synced lyrics.'
              : 'Spotify token expired or connection failed. Synced lyrics will fall back to Discord presence when available.'}
          </p>
        </div>
        <div className="border-t border-white/5 pt-4 mt-6 flex justify-between items-center">
          <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">Fallback Mode Active</span>
          <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Awaiting Discord Playback</span>
        </div>
      </div>
    );
  }

  // 3. Render Empty State (No track is active or playing)
  if (!track || (!track.isPlaying && !track.song)) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[220px] w-full">
        <div className="text-white/10 mb-4">
          <svg role="img" viewBox="0 0 24 24" width="48" height="48" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
        </div>
        <div className="text-lg font-serif italic text-white/25">No music playing...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between h-full w-full">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-[#1db954] flex items-center justify-center">
            <svg role="img" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest text-white/30">
            {isPlaying ? 'Listening Now' : 'Paused on Spotify'}
          </span>
        </div>
      </div>

      {/* Main Metadata Display */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 w-full">
        {/* Album Art with Play/Pause hover feedback */}
        <div className="relative group/art flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden shadow-xl">
          <img
            src={track.albumArtUrl}
            alt={track.album}
            className="w-full h-full object-cover transition-transform duration-500 group-hover/art:scale-105"
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/art:opacity-100 transition-opacity duration-300">
            {isPlaying ? (
              <Pause size={20} className="text-white animate-pulse" />
            ) : (
              <Play size={20} className="text-white" />
            )}
          </div>
        </div>

        {/* Track Title and Artist Details */}
        <div className="flex-1 text-center sm:text-left min-w-0 w-full flex flex-col justify-center py-1">
          <h4 className="font-sans font-bold text-white text-base md:text-lg truncate leading-snug tracking-tight">
            {track.song}
          </h4>
          <p className="text-sm text-white/60 truncate mt-1">
            by <span className="font-semibold text-white/80">{track.artist}</span>
          </p>
          <p className="text-xs text-white/30 truncate mt-0.5">
            on <span className="italic">{track.album}</span>
          </p>
        </div>
      </div>

      {/* Lyrics Display Panel */}
      <div className="flex-1 w-full flex flex-col justify-center">
        {lyricsLoading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-2">
            <div className="w-4 h-4 border-2 border-emerald-500/20 border-t-[#1db954] rounded-full animate-spin" />
            <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Retrieving Lyrics...</span>
          </div>
        ) : hasSyncedLyrics ? (
          <LyricLineStack
            lines={lines}
            activeIndex={activeIndex}
            activeWordIndex={activeWordIndex}
            hasJapanese={hasJapanese}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <span className="text-xs font-serif italic text-white/20">Lyrics unavailable for this track</span>
          </div>
        )}
      </div>

      {/* Progress Section */}
      <div className="w-full mt-4">
        {/* Progress Bar */}
        <div className="h-1 bg-white/10 rounded-full overflow-hidden relative">
          <motion.div
            className="absolute top-0 left-0 h-full rounded-full bg-[#1db954]"
            initial={false}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: isPlaying ? 0.1 : 0.3, ease: 'easeOut' }}
          />
        </div>
        {/* Progress Timestamps */}
        <div className="flex justify-between mt-2 font-mono text-[9px] font-bold text-white/30 tracking-wider">
          <span>{formatPlaybackTime(activeProgressMs)}</span>
          <span>{formatPlaybackTime(track.durationMs)}</span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-6">
        <span className="text-[9px] font-bold uppercase tracking-widest text-white/25">
          {hasSyncedLyrics ? `Synced via ${lyricsSource.toUpperCase()}` : 'LRC Unavailable'}
        </span>
        <a
          href={track.spotifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[#1db954] hover:text-[#22c55e] transition-colors"
        >
          Open Spotify
          <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
}
