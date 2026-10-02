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

import type { Lyric } from '@braccato/types';

export type { Lyric, LyricPart } from '@braccato/types';

/** The `<braccato-lyrics>` custom element, as this app drives it. */
export interface BraccatoView extends HTMLElement {
  lyrics: Lyric[] | null;
  /** Playback position in SECONDS. */
  currentTime: number;
  playing: boolean;
  renderer?: { noteUserScroll: () => void };
}

// Braccato ships no JSX typings, so teach React about the custom element.
declare global {
  /* eslint-disable @typescript-eslint/no-namespace */
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        'braccato-lyrics': React.DetailedHTMLProps<
          React.HTMLAttributes<BraccatoView>,
          BraccatoView
        >;
      }
    }
  }
  /* eslint-enable @typescript-eslint/no-namespace */
}

export type LyricsResponse = {
  source: 'unison' | 'betterlyrics' | 'lrclib' | 'none';
  synced: boolean;
  lines: Lyric[];
  hasJapanese?: boolean;
};
