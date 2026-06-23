import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { SyncedLyricLine } from '../types/spotify';

interface LyricLineStackProps {
  activeLine: SyncedLyricLine | null;
  previousLine: SyncedLyricLine | null;
  nextLine: SyncedLyricLine | null;
}

export function LyricLineStack({ activeLine, previousLine, nextLine }: LyricLineStackProps) {
  const shouldReduceMotion = useReducedMotion();

  // Animation variants for the active lyric line
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

  // Variants for context lines (previous and next)
  const contextVariants = {
    initial: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 8,
    },
    animate: (opacityValue: number) => ({
      opacity: opacityValue,
      y: 0,
      transition: { duration: 0.3 },
    }),
    exit: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : -8,
      transition: { duration: 0.25 },
    },
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4 my-6 text-center select-none min-h-[140px] overflow-hidden w-full">
      {/* Previous Lyric Line */}
      <div className="h-6 flex items-center justify-center overflow-hidden w-full px-4">
        <AnimatePresence mode="popLayout">
          {previousLine && (
            <motion.p
              key={`prev-${previousLine.timeMs}`}
              variants={contextVariants}
              custom={0.3}
              initial="initial"
              animate="animate"
              exit="exit"
              className="text-xs md:text-sm font-medium text-white/30 truncate max-w-full"
            >
              {previousLine.text}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Active Lyric Line (Focus) */}
      <div className="h-16 flex items-center justify-center overflow-hidden w-full px-6 py-1">
        <AnimatePresence mode="popLayout">
          {activeLine ? (
            <motion.p
              key={`active-${activeLine.timeMs}`}
              variants={activeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="text-base md:text-xl font-black text-white tracking-tight leading-snug max-w-full"
              style={{
                textShadow: '0 2px 10px rgba(255,255,255,0.05)',
              }}
            >
              {activeLine.text}
            </motion.p>
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
      <div className="h-6 flex items-center justify-center overflow-hidden w-full px-4">
        <AnimatePresence mode="popLayout">
          {nextLine && (
            <motion.p
              key={`next-${nextLine.timeMs}`}
              variants={contextVariants}
              custom={0.4}
              initial="initial"
              animate="animate"
              exit="exit"
              className="text-xs md:text-sm font-medium text-white/40 truncate max-w-full"
            >
              {nextLine.text}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
