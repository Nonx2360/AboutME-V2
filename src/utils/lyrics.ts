import type { SyncedLyricLine } from '../types/spotify';

/**
 * Parses an LRC format string into structured SyncedLyricLine objects.
 */
export function parseLrc(lrc: string): SyncedLyricLine[] {
  if (!lrc) return [];
  const lines = lrc.split('\n');
  const result: SyncedLyricLine[] = [];
  
  // LRC timestamp regex: [mm:ss.xx] or [mm:ss.xxx] or [mm:ss]
  const timeRegex = /\[(\d+):(\d+)(?:\.(\d+))?\]/;
  
  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const millisecondsStr = match[3] || '0';
      const msVal = parseInt(millisecondsStr.padEnd(3, '0').slice(0, 3), 10);
      
      const timeMs = (minutes * 60 + seconds) * 1000 + msVal;
      const text = line.replace(timeRegex, '').trim();
      
      if (text || line.trim().endsWith(']')) {
        result.push({ timeMs, text });
      }
    }
  }
  
  return result.sort((a, b) => a.timeMs - b.timeMs);
}

/**
 * Finds the index of the active lyric line for the current playback position.
 */
export function findActiveLyricIndex(lines: SyncedLyricLine[], progressMs: number): number {
  if (!lines || lines.length === 0) return -1;
  
  let activeIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (progressMs >= lines[i].timeMs) {
      activeIndex = i;
    } else {
      break;
    }
  }
  
  return activeIndex;
}

/**
 * Formats time in milliseconds to a mm:ss (or h:mm:ss) string.
 */
export function formatPlaybackTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
