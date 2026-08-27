import { useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { SyncedLyricLine } from '../types/spotify';
import { useState } from 'react';

interface LyricLineStackProps {
  lines: SyncedLyricLine[];
  activeIndex: number;
  displayProgressMs: number;
  hasJapanese?: boolean;
}

const LINE_H = 72;

function WordSyncLine({ line, displayProgressMs }: { line: SyncedLyricLine; displayProgressMs: number }) {
  const words = line.words ?? [];
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-[0.28em]">
      {words.map((w, i) => {
        const wordStart = w.timeMs;
        const wordEnd = w.endMs || wordStart + 300;
        let progress = 0;
        if (displayProgressMs >= wordEnd) {
          progress = 1;
        } else if (displayProgressMs >= wordStart) {
          progress = wordEnd > wordStart
            ? (displayProgressMs - wordStart) / (wordEnd - wordStart)
            : 1;
        }
        const pct = (progress * 100).toFixed(1);
        const isActive = progress > 0 && progress < 1;

        return (
          <span
            key={`${wordStart}-${i}`}
            className="lyric-word inline-block"
            style={{
              '--progress': `${pct}%`,
              marginRight: '0.28em',
              transform: isActive ? 'scale(1.03)' : 'scale(1)',
              filter: isActive ? 'drop-shadow(0 2px 10px rgba(255,255,255,0.25))' : 'none',
              transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.25s ease',
            } as React.CSSProperties}
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
  displayProgressMs,
  hasJapanese = false,
}: LyricLineStackProps) {
  const reduced = useReducedMotion();
  const [romajiEnabled, setRomajiEnabled] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<(HTMLDivElement | null)[]>([]);

  const safeLines = useMemo(() => lines ?? [], [lines]);

  // Scroll active line into center
  useEffect(() => {
    if (reduced || activeIndex < 0 || !containerRef.current) return;

    const container = containerRef.current;
    const activeEl = linesRef.current[activeIndex];
    if (!activeEl) return;

    const containerH = container.clientHeight;
    const targetScroll = activeEl.offsetTop - containerH / 2 + activeEl.offsetHeight / 2;

    container.scrollTo({
      top: targetScroll,
      behavior: reduced ? 'auto' : 'smooth',
    });
  }, [activeIndex, reduced]);

  const isEmpty = safeLines.length === 0;

  return (
    <div className="relative w-full select-none min-h-[200px]">
      {/* Top fade */}
      <div
        className="absolute inset-x-0 top-0 h-16 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, #121212 0%, transparent 100%)' }}
      />
      {/* Bottom fade */}
      <div
        className="absolute inset-x-0 bottom-0 h-16 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to top, #121212 0%, transparent 100%)' }}
      />

      {/* Scrollable lyrics area */}
      <div
        ref={containerRef}
        className="overflow-y-auto overflow-x-hidden relative z-0 scrollbar-none"
        style={{ maxHeight: `${LINE_H * 5}px`, scrollBehavior: reduced ? 'auto' : 'smooth' }}
      >
        {/* Top spacer to allow first lines to center */}
        <div style={{ height: `${LINE_H * 2}px` }} />

        {safeLines.map((line, i) => {
          const isPast   = i < activeIndex;
          const isActive = i === activeIndex;
          const hasWordSync = isActive && line.words && line.words.length > 1;

          return (
            <div
              key={`${line.timeMs}-${line.text}`}
              ref={(el) => { linesRef.current[i] = el; }}
              className="flex flex-col items-center justify-center w-full transition-all"
              style={{
                height: `${LINE_H}px`,
                opacity: isPast ? 0 : isActive ? 1 : 0.3,
                transform: isActive ? 'scale(1)' : 'scale(0.97)',
                transitionProperty: 'opacity, transform',
                transitionDuration: '0.5s',
                transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {hasWordSync ? (
                <div
                  className="text-center leading-snug max-w-full w-full"
                  style={{
                    fontSize: '1.6rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    textShadow: '0 0 30px rgba(255,255,255,0.3), 0 2px 8px rgba(0,0,0,0.3)',
                  }}
                >
                  <WordSyncLine line={line} displayProgressMs={displayProgressMs} />
                </div>
              ) : (
                <p
                  className="text-center leading-snug max-w-full truncate w-full"
                  style={{
                    fontSize: isActive ? '1.6rem' : '1.3rem',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#ffffff' : 'rgba(255,255,255,0.3)',
                    textShadow: isActive ? '0 0 30px rgba(255,255,255,0.3), 0 2px 8px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.2)',
                  }}
                >
                  {line.text}
                </p>
              )}

              <AnimatePresence>
                {isActive && romajiEnabled && line.romaji && (
                  <motion.p
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 0.65, y: 0, transition: { duration: 0.35, delay: 0.05 } }}
                    exit={{ opacity: 0, y: -3, transition: { duration: 0.2 } }}
                    className="text-[10px] font-medium tracking-wider italic mt-0.5"
                    style={{ color: 'rgba(29,185,84,0.8)' }}
                  >
                    {line.romaji}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Bottom spacer to allow last lines to center */}
        <div style={{ height: `${LINE_H * 2}px` }} />
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
        {!isEmpty && activeIndex === -1 && (
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
