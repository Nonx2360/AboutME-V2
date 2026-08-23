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

// Apple Music lyric line height
const LINE_H = 56;
const VISIBLE = 7;
const CENTER = Math.floor(VISIBLE / 2);

function getDistance(i: number, active: number): number {
  return Math.abs(i - active);
}

// Apple Music style: active = bright white large, non-active = progressive blur + fade + scale
function getLineStyle(dist: number) {
  if (dist === 0) return { opacity: 1,    fontSize: '1.28rem', fontWeight: 700 as const, blur: 0,   scale: 1,    color: '#ffffff' };
  if (dist === 1) return { opacity: 0.45, fontSize: '1.05rem', fontWeight: 600 as const, blur: 0.3, scale: 0.96, color: 'rgba(255,255,255,0.6)' };
  if (dist === 2) return { opacity: 0.22, fontSize: '0.95rem', fontWeight: 500 as const, blur: 1.2, scale: 0.92, color: 'rgba(255,255,255,0.3)' };
  if (dist === 3) return { opacity: 0.08, fontSize: '0.88rem', fontWeight: 500 as const, blur: 2.2, scale: 0.88, color: 'rgba(255,255,255,0.12)' };
  return              { opacity: 0.02, fontSize: '0.82rem', fontWeight: 400 as const, blur: 4,   scale: 0.85, color: 'rgba(255,255,255,0.03)' };
}

/**
 * Apple Music word-sync: words smoothly transition from dim to active glow to settled white
 */
function WordSyncLine({ line, activeWordIndex }: { line: SyncedLyricLine; activeWordIndex: number }) {
  const words = line.words ?? [];
  return (
    <span className="inline-flex flex-wrap justify-center items-center gap-x-[0.3em] gap-y-1">
      {words.map((w, i) => {
        const isPast   = activeWordIndex >= 0 && i < activeWordIndex;
        const isActive = i === activeWordIndex;
        const isFuture = !isPast && !isActive;

        return (
          <span
            key={`${w.timeMs}-${i}`}
            className="inline-block transition-all duration-300 ease-out"
            style={{
              fontWeight: isActive ? 800 : isPast ? 700 : 600,
              fontSize: '1.28rem',
              color: isFuture ? 'rgba(255,255,255,0.22)' : '#ffffff',
              textShadow: isActive
                ? '0 0 20px rgba(255,255,255,0.7), 0 0 35px rgba(255,255,255,0.3)'
                : isPast
                  ? '0 0 8px rgba(255,255,255,0.12)'
                  : 'none',
              opacity: isFuture ? 0.35 : 1,
              transform: isActive ? 'scale(1.04)' : 'scale(1)',
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

  // Smooth scroll: compute Y position centered with buttery spring ease
  useEffect(() => {
    if (reduced || !containerRef.current || !lyricsWrapRef.current || windowLines.length === 0) return;

    const localActive = activeIndex - windowStart;
    if (localActive < 0 || localActive >= windowLines.length) return;

    const containerH  = containerRef.current.clientHeight;
    const centerOffset = (containerH - LINE_H) / 2;
    const targetY     = -(localActive * LINE_H) + centerOffset;

    lyricsWrapRef.current.animate(
      [{ transform: `translate3d(0, ${targetY}px, 0)` }],
      { duration: reduced ? 0 : 600, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
    );
  }, [activeIndex, windowStart, windowLines.length, reduced]);

  const containerH = VISIBLE * LINE_H;

  return (
    <div className="relative w-full select-none min-h-[220px]">
      {/* Top fade gradient */}
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#121212] via-[#121212]/70 to-transparent z-10 pointer-events-none" />
      {/* Bottom fade gradient */}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#121212] via-[#121212]/70 to-transparent z-10 pointer-events-none" />

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
              const hasWordSync = isActive && line.words && line.words.length > 1;

              return (
                <motion.div
                  key={`${line.timeMs}-${line.text}`}
                  layout
                  initial={{ opacity: 0, y: reduced ? 0 : 16 }}
                  animate={{
                    opacity: style.opacity,
                    y: 0,
                    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
                  }}
                  exit={{ opacity: 0, y: reduced ? 0 : -12, transition: { duration: 0.35 } }}
                  className="flex flex-col items-center justify-center px-4 w-full"
                  style={{ height: `${LINE_H}px` }}
                >
                  {hasWordSync ? (
                    <div
                      className="text-center leading-snug max-w-full w-full transition-transform duration-500 ease-out"
                      style={{
                        transform: `scale(${style.scale})`,
                      }}
                    >
                      <WordSyncLine line={line} activeWordIndex={activeWordIndex} />
                    </div>
                  ) : (
                    <p
                      className="text-center leading-snug max-w-full truncate w-full transition-all duration-600 ease-out"
                      style={{
                        fontSize: style.fontSize,
                        fontWeight: style.fontWeight,
                        color: style.color,
                        filter: style.blur > 0 ? `blur(${style.blur}px)` : 'none',
                        transform: `scale(${style.scale})`,
                        textShadow: isActive ? '0 0 24px rgba(255,255,255,0.4), 0 0 45px rgba(255,255,255,0.15)' : 'none',
                      }}
                    >
                      {line.text}
                    </p>
                  )}

                  <AnimatePresence>
                    {isActive && romajiEnabled && line.romaji && (
                      <motion.p
                        initial={{ opacity: 0, y: 3 }}
                        animate={{ opacity: 0.75, y: 0, transition: { duration: 0.35, delay: 0.05 } }}
                        exit={{ opacity: 0, y: -3, transition: { duration: 0.2 } }}
                        className="text-[10px] font-medium tracking-wider italic mt-0.5"
                        style={{ color: 'rgba(29,185,84,0.85)' }}
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

