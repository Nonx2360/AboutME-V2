import { useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { SyncedLyricLine } from '../types/spotify';
import { useState } from 'react';

interface LyricLineStackProps {
  lines: SyncedLyricLine[];
  activeIndex: number;
  displayProgressMs: number;
  albumArtUrl?: string;
  hasJapanese?: boolean;
}

/**
 * SLG-style: show only the current active line with word-by-word gradient fill.
 * No scrolling, no upcoming lines — just one line at a time.
 */
function WordSyncLine({ line, progressRef }: { line: SyncedLyricLine; progressRef: React.RefObject<number> }) {
  const spanRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const prevPcts = useRef<number[]>([]);
  const words = useMemo(() => line.words ?? [], [line.words]);

  useEffect(() => {
    let rafId: number;

    const tick = () => {
      const now = progressRef.current;
      const spans = spanRefs.current;
      const prev = prevPcts.current;

      for (let i = 0; i < spans.length; i++) {
        const el = spans[i];
        if (!el) continue;
        const w = words[i];
        const wordEnd = w.endMs || w.timeMs + 300;
        const duration = wordEnd - w.timeMs;

        let pct: number;
        if (now >= wordEnd) pct = 100;
        else if (now <= w.timeMs) pct = 0;
        else pct = duration > 0 ? ((now - w.timeMs) / duration) * 100 : 100;

        const rounded = Math.round(pct * 10) / 10;
        if (prev[i] === rounded) continue;
        prev[i] = rounded;

        el.style.setProperty('--progress', `${rounded.toFixed(1)}%`);
        el.classList.toggle('active', rounded > 0 && rounded < 100);
      }

      rafId = requestAnimationFrame(tick);
    };

    prevPcts.current = new Array(words.length).fill(-1);
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [words, progressRef]);

  return (
    <span className="inline-flex flex-wrap items-baseline" style={{ gap: '0.18em' }}>
      {words.map((w, i) => (
        <span
          key={`${w.timeMs}-${i}`}
          ref={(el) => { spanRefs.current[i] = el; }}
          className="lyric-word inline-block"
          style={{ whiteSpace: 'nowrap' }}
        >
          {w.text}
        </span>
      ))}
    </span>
  );
}

export function LyricLineStack({
  lines,
  activeIndex,
  displayProgressMs,
  albumArtUrl,
  hasJapanese = false,
}: LyricLineStackProps) {
  const reduced = useReducedMotion();
  const [romajiEnabled, setRomajiEnabled] = useState(true);
  const progressRef = useRef<number>(displayProgressMs);

  useEffect(() => {
    progressRef.current = displayProgressMs;
  });

  const safeLines = useMemo(() => lines ?? [], [lines]);
  const activeLine = activeIndex >= 0 && activeIndex < safeLines.length ? safeLines[activeIndex] : null;
  const hasWordSync = activeLine?.words && activeLine.words.length > 1;
  const isEmpty = safeLines.length === 0;

  return (
    <div className="relative w-full select-none min-h-[200px] rounded-2xl overflow-hidden">
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

      {/* Lyrics area — single centered line */}
      <div className="relative z-10 flex items-center justify-center min-h-[200px] px-6">
        <AnimatePresence mode="wait">
          {activeLine ? (
            <motion.div
              key={`${activeLine.timeMs}-${activeLine.text}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: reduced ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="text-center leading-snug max-w-full"
              style={{
                fontSize: '1.6rem',
                fontWeight: 700,
                color: '#ffffff',
                textShadow: '0 0 30px rgba(255,255,255,0.3), 0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              {hasWordSync ? (
                <WordSyncLine line={activeLine} progressRef={progressRef} />
              ) : (
                activeLine.text
              )}

              {romajiEnabled && activeLine.romaji && (
                <p
                  className="text-[10px] font-medium tracking-wider italic mt-1.5"
                  style={{ color: 'rgba(29,185,84,0.7)' }}
                >
                  {activeLine.romaji}
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="text-4xl opacity-30">♪</div>
              <p className="text-sm font-serif italic text-white/40 tracking-wide">
                {isEmpty ? 'No lyrics available' : 'Instrumental'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Romaji toggle */}
      <AnimatePresence>
        {hasJapanese && activeLine?.romaji && (
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
