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

const LINE_H = 72;

/**
 * Max-FPS word sync: single shared RAF loop, GPU-only properties, skip unchanged.
 * Each word span gets direct DOM updates — no React re-renders at 60fps.
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

        // Skip if unchanged (round to 0.1% for smooth gradient)
        const rounded = Math.round(pct * 10) / 10;
        if (prev[i] === rounded) continue;
        prev[i] = rounded;

        // Only update gradient — class toggle handles scale/shadow
        el.style.setProperty('--progress', `${rounded.toFixed(1)}%`);

        // Toggle active class (CSS transition handles the animation)
        const active = rounded > 0 && rounded < 100;
        el.classList.toggle('active', active);
      }

      rafId = requestAnimationFrame(tick);
    };

    // Init prev array
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
  const containerRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<(HTMLDivElement | null)[]>([]);
  const progressRef = useRef<number>(displayProgressMs);

  useEffect(() => {
    progressRef.current = displayProgressMs;
  });

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

      {/* Top fade */}
      <div
        className="absolute inset-x-0 top-0 h-16 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(18,18,18,0.9) 0%, transparent 100%)' }}
      />
      {/* Bottom fade */}
      <div
        className="absolute inset-x-0 bottom-0 h-16 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(18,18,18,0.9) 0%, transparent 100%)' }}
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
                  <WordSyncLine line={line} progressRef={progressRef} />
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center z-20 gap-3"
          >
            <div className="text-4xl opacity-30">♪</div>
            <p className="text-sm font-serif italic text-white/40 tracking-wide">
              Instrumental
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
