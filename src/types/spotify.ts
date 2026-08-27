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

export type SyncedLyricWord = {
  timeMs: number;
  endMs: number;
  text: string;
};

export type SyncedLyricLine = {
  timeMs: number;
  text: string;
  romaji?: string | null;
  words?: SyncedLyricWord[];
};

export type LyricsResponse = {
  source: 'unison' | 'lrclib' | 'none';
  synced: boolean;
  lines: SyncedLyricLine[];
  hasJapanese?: boolean;
};
