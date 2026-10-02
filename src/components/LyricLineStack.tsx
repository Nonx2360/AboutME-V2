import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  hasJapanese?: boolean;
}

/**
 * Renders synced lyrics with the Braccato engine — the same renderer behind
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
  hasJapanese = false,
}: LyricLineStackProps) {
  const [romajiEnabled, setRomajiEnabled] = useState(true);
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
    if (el) el.lyrics = lines.length > 0 ? lines : null;
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

  const hasRomanization = lines.some(l => l.romanization);

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

      {/* Lyrics area — the engine scrolls the active line to centre stage */}
      <div className="relative z-10 min-h-[200px]">
        <braccato-lyrics
          ref={viewRef}
          className={romajiEnabled ? 'lyrics-host' : 'lyrics-host lyrics-hide-romanization'}
          style={{
            display: 'block',
            height: 200,
            overflowY: 'auto',
            '--blyrics-font-size': '1.6rem',
            '--blyrics-lyric-active-color': '#ffffff',
          } as React.CSSProperties}
        />
      </div>

      {/* Romaji toggle — Braccato renders the romanization line itself */}
      <AnimatePresence>
        {hasJapanese && hasRomanization && (
          <motion.button
            key="romaji-toggle"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            onClick={() => setRomajiEnabled(v => !v)}
            aria-pressed={romajiEnabled}
            aria-label={romajiEnabled ? 'Hide Romaji' : 'Show Romaji'}
            className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent z-20"
            style={{
              background: romajiEnabled ? 'rgba(29,185,84,0.12)' : 'rgba(255,255,255,0.05)',
              color: romajiEnabled ? '#1db954' : 'rgba(255,255,255,0.22)',
              border: `1px solid ${romajiEnabled ? 'rgba(29,185,84,0.3)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            <span style={{ fontFamily: 'serif', fontSize: '10px' }}>あ</span>
            {romajiEnabled ? 'Romaji ON' : 'Romaji OFF'}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
