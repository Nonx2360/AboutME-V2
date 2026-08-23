export type NowPlayingTrack = {
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
  fetchedAt: number;
  trackId: string;
  song: string;
  artist: string;
  album: string;
  albumArtUrl: string;
  spotifyUrl: string;
  error?: string;
};

export type SyncedLyricLine = {
  timeMs: number;
  text: string;
  /** Server-computed Hepburn Romaji. null = non-Japanese line. Populated by /api/lyrics. */
  romaji?: string | null;
};

export type LyricsResponse = {
  source: 'lrclib' | 'local' | 'none';
  synced: boolean;
  lines: SyncedLyricLine[];
  /** True if any line contains Japanese — drives the Romaji toggle visibility. */
  hasJapanese?: boolean;
};
