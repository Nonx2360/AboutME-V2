import { useRef, useEffect } from 'react';
import type { Lyric } from '@braccato/types';
import type { BraccatoView } from '../types/spotify';
import '@braccato/core/element';
import '@braccato/core/styles/variables.css';
import '@braccato/core/styles/lyrics.css';
import '@braccato/core/styles/instrumental.css';

interface LyricLineStackProps {
  lines: Lyric[];
  displayProgressMs: number;
  isPlaying?: boolean;
  albumArtUrl?: string;
}

/**
 * Appends each line's romanization inside Braccato's own line element.
 *
 * Braccato's builder only reads `words` and `parts`, so a `romanization` on the
 * Lyric is ignored entirely. Its public `injectRomanization` needs the internal
 * LineData records, which the element does not expose, so the text is appended
 * here using Braccato's published `blyrics--romanized` class — the same hook
 * its stylesheet themes, so this looks native rather than bolted on.
 *
 * Runs after `el.lyrics` is assigned, since assigning rebuilds all the lines.
 */
function attachRomanization(view: HTMLElement, lines: Lyric[]): void {
  view.querySelectorAll('.blyrics--romanized').forEach((el) => el.remove());

  lines.forEach((lyric, index) => {
    if (!lyric.romanization || lyric.isInstrumental) return;
    // Braccato stamps each built line with its source array index.
    const lineEl = view.querySelector<HTMLElement>(
      `.blyrics--line[data-line-number="${index}"]`
    );
    if (!lineEl) return;

    const romanized = view.ownerDocument.createElement('span');
    romanized.className = 'blyrics--romanized';
    romanized.lang = 'en-Latn';
    romanized.textContent = lyric.romanization;
    lineEl.appendChild(romanized);
  });
}

/**
 * Renders synced lyrics with the Braccato engine â€” the same renderer behind
 * the Better Lyrics browser extension.
 *
 * Braccato owns the DOM, so the clock is written straight onto the element each
 * frame instead of round-tripping through React state. The parent already
 * ticks `displayProgressMs` at 60fps, and re-rendering this subtree that often
 * would fight the engine's own per-frame layout work.
 */
export function LyricLineStack({
  lines,
  displayProgressMs,
  isPlaying = false,
  albumArtUrl,
}: LyricLineStackProps) {
  const viewRef = useRef<BraccatoView | null>(null);

  const progressRef = useRef(displayProgressMs);
  const playingRef = useRef(isPlaying);

  // Mirror the latest props into refs so the frame loop below never has to be
  // torn down and rebuilt when the parent re-renders.
  useEffect(() => {
    progressRef.current = displayProgressMs;
    playingRef.current = isPlaying;
  }, [displayProgressMs, isPlaying]);

  // Parsing happens server-side, so this is just a hand-off of structured data.
  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    el.lyrics = lines.length > 0 ? lines : null;
    attachRomanization(el, lines);
  }, [lines]);

  // Drive the engine clock. Braccato reads seconds; we track milliseconds.
  useEffect(() => {
    let frame: number;
    let lastTime = -1;
    let lastPlaying: boolean | null = null;
    const tick = () => {
      const el = viewRef.current;
      if (el) {
        const next = progressRef.current / 1000;
        // Each property write re-renders the whole view, and `playing` only
        // changes on pause/resume. Writing both every frame doubles that cost
        // for no benefit, so skip no-op writes.
        if (next !== lastTime) {
          lastTime = next;
          el.currentTime = next;
        }
        if (playingRef.current !== lastPlaying) {
          lastPlaying = playingRef.current;
          el.playing = lastPlaying;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Autoscroll keeps yanking the view back unless we tell it the user scrolled.
  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    const noteUserScroll = () => el.renderer?.noteUserScroll();
    el.addEventListener('scroll', noteUserScroll, { passive: true });
    return () => el.removeEventListener('scroll', noteUserScroll);
  }, []);

  return (
    <div className="relative w-full select-none rounded-2xl overflow-hidden">
      {/* Blurred album art background */}
      {albumArtUrl && (
        <div className="absolute inset-0 z-0">
          <img
            src={albumArtUrl}
            alt=""
            className="w-full h-full object-cover scale-110"
            style={{ filter: 'blur(40px) brightness(0.35) saturate(1.4)' }}
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}

      {/* Lyrics area â€” the engine scrolls the active line to centre stage */}
      <div className="relative z-10 min-h-[200px]">
        <braccato-lyrics
          ref={viewRef}
          className="lyrics-host"
          style={{
            display: 'block',
            height: 200,
            overflowY: 'auto',
            '--blyrics-font-size': '1.6rem',
            '--blyrics-lyric-active-color': '#ffffff',
          } as React.CSSProperties}
        />
      </div>
    </div>
  );
}
