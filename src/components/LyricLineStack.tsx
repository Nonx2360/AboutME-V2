import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { SyncedLyricLine } from '../types/spotify';
import { useState } from 'react';

interface LyricLineStackProps {
  activeLine: SyncedLyricLine | null;
  previousLine: SyncedLyricLine | null;
  nextLine: SyncedLyricLine | null;
  /** Passed from useSyncedLyrics — true when the track has any Japanese lines. */
  hasJapanese?: boolean;
}

export function LyricLineStack({ activeLine, previousLine, nextLine, hasJapanese = false }: LyricLineStackProps) {
  const shouldReduceMotion = useReducedMotion();
  // Romaji is ON by default when Japanese is detected
  const [romajiEnabled, setRomajiEnabled] = useState(true);

  // ── Animation variants ───────────────────────────────────────────────────────

  const activeVariants = {
    initial: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 12,
      filter: 'blur(4px)',
    },
    animate: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.3, ease: [0.25, 1, 0.5, 1] as const },
    },
    exit: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : -12,
      filter: 'blur(4px)',
      transition: { duration: 0.25, ease: [0.25, 1, 0.5, 1] as const },
    },
  };

  const contextVariants = {
    initial: { opacity: 0, y: shouldReduceMotion ? 0 : 8 },
    animate: (opacityValue: number) => ({
      opacity: opacityValue,
      y: 0,
      transition: { duration: 0.3 },
    }),
    exit: { opacity: 0, y: shouldReduceMotion ? 0 : -8, transition: { duration: 0.25 } },
  };

  const romajiVariants = {
    initial: { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.25, delay: 0.08 } },
    exit: { opacity: 0, y: -4, transition: { duration: 0.2 } },
  };

  // ── Resolved romaji strings (from server — null for non-JP lines) ─────────

  const activeRomaji = romajiEnabled ? (activeLine?.romaji ?? null) : null;
  const prevRomaji   = romajiEnabled ? (previousLine?.romaji ?? null) : null;
  const nextRomaji   = romajiEnabled ? (nextLine?.romaji ?? null) : null;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center justify-center space-y-3 my-6 text-center select-none min-h-[140px] overflow-hidden w-full">

      {/* Previous Lyric Line */}
      <div
        className="flex items-center justify-center overflow-hidden w-full px-4 transition-all duration-300"
        style={{ minHeight: prevRomaji ? '3.25rem' : '1.5rem' }}
      >
        <AnimatePresence mode="popLayout">
          {previousLine && (
            <motion.div
              key={`prev-${previousLine.timeMs}`}
              variants={contextVariants}
              custom={0.3}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col items-center gap-0.5 w-full"
            >
              <p className="text-xs md:text-sm font-medium text-white/30 truncate max-w-full">
                {previousLine.text}
              </p>
              <AnimatePresence>
                {prevRomaji && (
                  <motion.p
                    key={`prev-rom-${previousLine.timeMs}`}
                    variants={romajiVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="text-[10px] font-medium text-white/20 truncate max-w-full tracking-wide italic"
                  >
                    {prevRomaji}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Active Lyric Line (Focus) */}
      <div
        className="flex items-center justify-center overflow-hidden w-full px-6 py-1 transition-all duration-300"
        style={{ minHeight: activeRomaji ? '5.75rem' : '4rem' }}
      >
        <AnimatePresence mode="popLayout">
          {activeLine ? (
            <motion.div
              key={`active-${activeLine.timeMs}`}
              variants={activeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col items-center gap-1.5 w-full"
            >
              {/* Primary lyric */}
              <p
                className="text-base md:text-xl font-black text-white tracking-tight leading-snug max-w-full"
                style={{ textShadow: '0 2px 10px rgba(255,255,255,0.08)' }}
              >
                {activeLine.text}
              </p>

              {/* Romaji sub-line — animated in/out with toggle */}
              <AnimatePresence mode="popLayout">
                {activeRomaji && (
                  <motion.p
                    key={`active-rom-${activeLine.timeMs}`}
                    variants={romajiVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="text-xs md:text-sm font-medium tracking-wider italic max-w-full truncate"
                    style={{ color: 'rgba(29,185,84,0.75)' }}
                  >
                    {activeRomaji}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.p
              key="intro-outro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="text-sm font-serif italic text-white/30"
            >
              Instrumental / Intro
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Next Lyric Line */}
      <div
        className="flex items-center justify-center overflow-hidden w-full px-4 transition-all duration-300"
        style={{ minHeight: nextRomaji ? '3.25rem' : '1.5rem' }}
      >
        <AnimatePresence mode="popLayout">
          {nextLine && (
            <motion.div
              key={`next-${nextLine.timeMs}`}
              variants={contextVariants}
              custom={0.4}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col items-center gap-0.5 w-full"
            >
              <p className="text-xs md:text-sm font-medium text-white/40 truncate max-w-full">
                {nextLine.text}
              </p>
              <AnimatePresence>
                {nextRomaji && (
                  <motion.p
                    key={`next-rom-${nextLine.timeMs}`}
                    variants={romajiVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="text-[10px] font-medium text-white/25 truncate max-w-full tracking-wide italic"
                  >
                    {nextRomaji}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Romaji toggle pill — only visible on JP tracks ── */}
      <AnimatePresence>
        {hasJapanese && (
          <motion.button
            key="romaji-toggle"
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.25 } }}
            exit={{ opacity: 0, y: 6, scale: 0.9, transition: { duration: 0.2 } }}
            onClick={() => setRomajiEnabled(v => !v)}
            aria-pressed={romajiEnabled}
            aria-label={romajiEnabled ? 'Hide Romaji' : 'Show Romaji'}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            style={{
              background: romajiEnabled
                ? 'rgba(29,185,84,0.12)'
                : 'rgba(255,255,255,0.05)',
              color: romajiEnabled ? '#1db954' : 'rgba(255,255,255,0.22)',
              border: `1px solid ${romajiEnabled ? 'rgba(29,185,84,0.30)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            {/* Katakana "ロ" as indicator */}
            <span style={{ fontFamily: 'serif', fontSize: '10px', lineHeight: 1 }}>あ</span>
            {romajiEnabled ? 'Romaji ON' : 'Romaji OFF'}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
