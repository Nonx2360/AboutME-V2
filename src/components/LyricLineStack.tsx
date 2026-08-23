import { useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { SyncedLyricLine } from '../types/spotify';
import { useState } from 'react';

interface LyricLineStackProps {
  lines: SyncedLyricLine[];
  activeIndex: number;
  activeWordIndex: number;
  hasJapanese?: boolean;
}

// Apple Music uses variable line heights: active line gets more room
const ACTIVE_LINE_H = 72;
const INACTIVE_LINE_H = 48;
const VISIBLE = 7;
const CENTER = Math.floor(VISIBLE / 2);

function getDistance(i: number, active: number): number {
  return Math.abs(i - active);
}

// Apple Music style: active = full white large, farther lines shrink + dim + blur
function getLineStyle(dist: number) {
  if (dist === 0) return { opacity: 1,    fontSize: '1.35rem', fontWeight: 800 as const, blur: 0,   scale: 1,    color: '#ffffff' };
  if (dist === 1) return { opacity: 0.5,  fontSize: '1.0rem',  fontWeight: 600 as const, blur: 0,   scale: 0.97, color: 'rgba(255,255,255,0.5)' };
  if (dist === 2) return { opacity: 0.28, fontSize: '0.9rem',  fontWeight: 500 as const, blur: 0.5, scale: 0.95, color: 'rgba(255,255,255,0.28)' };
  if (dist === 3) return { opacity: 0.12, fontSize: '0.85rem', fontWeight: 400 as const, blur: 1.5, scale: 0.93, color: 'rgba(255,255,255,0.12)' };
  return              { opacity: 0.04, fontSize: '0.8rem',  fontWeight: 400 as const, blur: 3,   scale: 0.9,  color: 'rgba(255,255,255,0.04)' };
}

/**
 * Apple Music word-sync: uniform font size across all words.
 * Past words = full white. Active word = white + glow. Future words = dim.
 * No per-word size changes — the whole line stays visually consistent.
 */
function WordSyncLine({ line, activeWordIndex }: { line: SyncedLyricLine; activeWordIndex: number }) {
  const words = line.words ?? [];
  return (
    <span className="inline-flex flex-wrap justify-center items-baseline gap-x-[0.28em] gap-y-1">
      {words.map((w, i) => {
        const isPast   = activeWordIndex >= 0 && i < activeWordIndex;
        const isActive = i === activeWordIndex;
        const isFuture = !isPast && !isActive;

        return (
          <span
            key={`${w.timeMs}-${i}`}
            className="inline-block"
            style={{
              transition: 'color 180ms cubic-bezier(0.4,0,0.2,1), text-shadow 180ms ease, opacity 180ms ease',
              fontWeight: 800,
              fontSize: '1.35rem',           // uniform — Apple Music doesn't resize words
              color: isFuture ? 'rgba(255,255,255,0.22)' : '#ffffff',
              textShadow: isActive
                ? '0 0 16px rgba(255,255,255,0.55), 0 0 32px rgba(255,255,255,0.2)'
                : isPast
                  ? '0 0 6px rgba(255,255,255,0.08)'
                  : 'none',
              opacity: isFuture ? 0.35 : 1,
            }}
          >
            {w.text}
          </span>
        );
      })}
    </span>
  );
}

export function LyricLineStack({
  lines,
  activeIndex,
  activeWordIndex,
  hasJapanese = false,
}: LyricLineStackProps) {
  const reduced = useReducedMotion();
  const [romajiEnabled, setRomajiEnabled] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const lyricsWrapRef = useRef<HTMLDivElement>(null);

  const safeLines = useMemo(() => lines ?? [], [lines]);

  const windowLines = useMemo(() => {
    if (safeLines.length === 0) return [];
    const start = Math.max(0, activeIndex - CENTER);
    const end   = Math.min(safeLines.length, start + VISIBLE);
    const s     = Math.max(0, end - VISIBLE);
    return safeLines.slice(s, end);
  }, [safeLines, activeIndex]);

  const windowStart = useMemo(() => {
    if (safeLines.length === 0) return 0;
    const start = Math.max(0, activeIndex - CENTER);
    const end   = Math.min(safeLines.length, start + VISIBLE);
    return Math.max(0, end - VISIBLE);
  }, [safeLines, activeIndex]);

  // Smooth scroll: compute cumulative Y to center active line
  useEffect(() => {
    if (reduced || !containerRef.current || !lyricsWrapRef.current || windowLines.length === 0) return;

    const localActive = activeIndex - windowStart;
    if (localActive < 0 || localActive >= windowLines.length) return;

    // Sum up heights of lines before the active one
    let offsetY = 0;
    for (let i = 0; i < localActive; i++) {
      const d = getDistance(windowStart + i, activeIndex);
      offsetY += d === 0 ? ACTIVE_LINE_H : INACTIVE_LINE_H;
    }

    const containerH  = containerRef.current.clientHeight;
    const activeMidY  = offsetY + ACTIVE_LINE_H / 2;
    const targetY     = containerH / 2 - activeMidY;

    lyricsWrapRef.current.animate(
      [{ transform: `translateY(${targetY}px)` }],
      { duration: reduced ? 0 : 550, easing: 'cubic-bezier(0.25, 1, 0.5, 1)', fill: 'forwards' }
    );
  }, [activeIndex, windowStart, windowLines.length, reduced]);

  // Container height: show enough lines with the active line being taller
  const containerH = VISIBLE * INACTIVE_LINE_H + (ACTIVE_LINE_H - INACTIVE_LINE_H);

  return (
    <div className="relative w-full select-none min-h-[220px]">
      {/* Top fade */}
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/95 via-black/60 to-transparent z-10 pointer-events-none" />
      {/* Bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-10 pointer-events-none" />

      {/* Scrollable lyrics area */}
      <div
        ref={containerRef}
        className="overflow-hidden relative z-0"
        style={{ height: `${containerH}px` }}
      >
        <div ref={lyricsWrapRef} style={{ willChange: 'transform' }}>
          <AnimatePresence mode="popLayout">
            {windowLines.map((line, i) => {
              const globalIdx  = windowStart + i;
              const dist       = getDistance(globalIdx, activeIndex);
              const style      = getLineStyle(dist);
              const isActive   = dist === 0;
              const lineHeight = isActive ? ACTIVE_LINE_H : INACTIVE_LINE_H;
              const hasWordSync = isActive && line.words && line.words.length > 1;

              return (
                <motion.div
                  key={`${line.timeMs}-${line.text}`}
                  layout
                  initial={{ opacity: 0, y: reduced ? 0 : 12 }}
                  animate={{
                    opacity: style.opacity,
                    y: 0,
                    transition: { duration: 0.5, ease: [0.25, 1, 0.5, 1] },
                  }}
                  exit={{ opacity: 0, y: reduced ? 0 : -8, transition: { duration: 0.3 } }}
                  className="flex flex-col items-center justify-center px-6 w-full"
                  style={{ height: `${lineHeight}px` }}
                >
                  {hasWordSync ? (
                    <p
                      className="text-center leading-snug max-w-full w-full"
                      style={{
                        transform: `scale(${style.scale})`,
                        transition: 'transform 400ms cubic-bezier(0.25,1,0.5,1)',
                      }}
                    >
                      <WordSyncLine line={line} activeWordIndex={activeWordIndex} />
                    </p>
                  ) : (
                    <p
                      className="text-center leading-snug max-w-full truncate w-full"
                      style={{
                        fontSize: style.fontSize,
                        fontWeight: style.fontWeight,
                        color: style.color,
                        filter: style.blur > 0 ? `blur(${style.blur}px)` : undefined,
                        transform: `scale(${style.scale})`,
                        textShadow: isActive ? '0 0 20px rgba(255,255,255,0.25)' : 'none',
                        transition: 'all 450ms cubic-bezier(0.25,1,0.5,1)',
                      }}
                    >
                      {line.text}
                    </p>
                  )}

                  <AnimatePresence>
                    {isActive && romajiEnabled && line.romaji && (
                      <motion.p
                        initial={{ opacity: 0, y: 3 }}
                        animate={{ opacity: 0.7, y: 0, transition: { duration: 0.3, delay: 0.05 } }}
                        exit={{ opacity: 0, y: -3, transition: { duration: 0.2 } }}
                        className="text-[10px] font-medium tracking-wider italic mt-0.5"
                        style={{ color: 'rgba(29,185,84,0.8)' }}
                      >
                        {line.romaji}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Romaji toggle */}
      <AnimatePresence>
        {hasJapanese && (
          <motion.button
            key="romaji-toggle"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            onClick={() => setRomajiEnabled(v => !v)}
            aria-pressed={romajiEnabled}
            aria-label={romajiEnabled ? 'Hide Romaji' : 'Show Romaji'}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
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

      {/* Instrumental / empty state */}
      <AnimatePresence>
        {safeLines.length > 0 && activeIndex === -1 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.25 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center text-sm font-serif italic text-white/30"
          >
            Instrumental
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

