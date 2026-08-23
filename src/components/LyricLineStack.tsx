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

const LINE_H = 52;
const VISIBLE = 7;
const CENTER = Math.floor(VISIBLE / 2);

function getDistance(i: number, active: number): number {
  return Math.abs(i - active);
}

function getLineStyle(dist: number) {
  if (dist === 0) return { opacity: 1, scale: 1.05, blur: 0, fontWeight: 700 as const };
  if (dist === 1) return { opacity: 0.38, scale: 0.98, blur: 0, fontWeight: 600 as const };
  if (dist === 2) return { opacity: 0.18, scale: 0.95, blur: 0.8, fontWeight: 500 as const };
  return { opacity: 0.06, scale: 0.92, blur: 2, fontWeight: 400 as const };
}

function WordSyncLine({ line, activeWordIndex }: { line: SyncedLyricLine; activeWordIndex: number }) {
  const words = line.words ?? [];
  return (
    <span className="inline-flex flex-wrap justify-center gap-x-[0.3em] gap-y-0">
      {words.map((w, i) => {
        const isPast = activeWordIndex >= 0 && i < activeWordIndex;
        const isActive = i === activeWordIndex;
        const isFuture = !isPast && !isActive;

        return (
          <span
            key={`${w.timeMs}-${i}`}
            className="inline-block transition-all"
            style={{
              transitionDuration: isActive ? '120ms' : isPast ? '250ms' : '200ms',
              transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
              fontWeight: isActive ? 800 : isPast ? 700 : 500,
              fontSize: isActive ? '1.35rem' : isPast ? '1.2rem' : '1.1rem',
              color: isActive
                ? '#ffffff'
                : isPast
                  ? 'rgba(255,255,255,0.92)'
                  : 'rgba(255,255,255,0.28)',
              textShadow: isActive
                ? '0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(255,255,255,0.2)'
                : isPast
                  ? '0 0 8px rgba(255,255,255,0.15)'
                  : 'none',
              filter: isFuture ? 'blur(0.3px)' : 'none',
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
    const end = Math.min(safeLines.length, start + VISIBLE);
    const s = Math.max(0, end - VISIBLE);
    return safeLines.slice(s, end);
  }, [safeLines, activeIndex]);

  const windowStart = useMemo(() => {
    if (safeLines.length === 0) return 0;
    const start = Math.max(0, activeIndex - CENTER);
    const end = Math.min(safeLines.length, start + VISIBLE);
    return Math.max(0, end - VISIBLE);
  }, [safeLines, activeIndex]);

  useEffect(() => {
    if (reduced || !containerRef.current || windowLines.length === 0) return;

    const localActive = activeIndex - windowStart;
    if (localActive < 0 || localActive >= windowLines.length) return;

    const container = containerRef.current;
    const containerH = container.clientHeight;
    const centerOffset = (containerH - LINE_H) / 2;
    const targetY = -(localActive * LINE_H) + centerOffset;

    lyricsWrapRef.current!.animate(
      [{ transform: `translateY(${targetY}px)` }],
      { duration: 500, easing: 'cubic-bezier(0.25, 1, 0.5, 1)', fill: 'forwards' }
    );
  }, [activeIndex, windowStart, windowLines.length, reduced]);

  return (
    <div className="relative w-full select-none min-h-[200px]">
      {/* Gradient masks */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/90 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/90 to-transparent z-10 pointer-events-none" />

      {/* Scrollable lyrics area */}
      <div
        ref={containerRef}
        className="overflow-hidden relative z-0"
        style={{ height: `${VISIBLE * LINE_H}px` }}
      >
        <div ref={lyricsWrapRef}>
          <AnimatePresence mode="popLayout">
            {windowLines.map((line, i) => {
              const globalIdx = windowStart + i;
              const dist = getDistance(globalIdx, activeIndex);
              const style = getLineStyle(dist);
              const isActive = dist === 0;
              const hasWordSync = isActive && line.words && line.words.length > 1;

              return (
                <motion.div
                  key={`${line.timeMs}-${line.text}`}
                  layout
                  initial={{ opacity: 0, y: reduced ? 0 : 10 }}
                  animate={{
                    opacity: style.opacity,
                    y: 0,
                    transition: { duration: 0.45, ease: [0.25, 1, 0.5, 1] },
                  }}
                  exit={{ opacity: 0, y: reduced ? 0 : -10, transition: { duration: 0.25 } }}
                  className="flex flex-col items-center justify-center px-4"
                  style={{ height: `${LINE_H}px` }}
                >
                  {hasWordSync ? (
                    <p
                      className="text-center leading-tight max-w-full transition-all duration-500"
                      style={{
                        fontWeight: style.fontWeight,
                        filter: style.blur > 0 ? `blur(${style.blur}px)` : undefined,
                        transform: `scale(${style.scale})`,
                        transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)',
                      }}
                    >
                      <WordSyncLine line={line} activeWordIndex={activeWordIndex} />
                    </p>
                  ) : (
                    <p
                      className="text-center leading-tight max-w-full truncate transition-all duration-500"
                      style={{
                        fontSize: isActive ? '1.2rem' : '0.88rem',
                        fontWeight: style.fontWeight,
                        filter: style.blur > 0 ? `blur(${style.blur}px)` : undefined,
                        transform: `scale(${style.scale})`,
                        color: isActive ? '#ffffff' : `rgba(255,255,255,${style.opacity * 0.85})`,
                        textShadow: isActive ? '0 0 24px rgba(255,255,255,0.35)' : 'none',
                        transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)',
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
