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
};

export type LyricsResponse = {
  source: 'lrclib' | 'local' | 'none';
  synced: boolean;
  lines: SyncedLyricLine[];
};
