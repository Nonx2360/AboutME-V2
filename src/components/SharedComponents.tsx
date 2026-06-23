import { useEffect, useState } from 'react';
import { Gamepad2, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';
import type { LanyardData } from '../hooks/useLanyard';

const formatTime = (ms: number) => {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const SpotifyInner = ({ spotify }: { spotify: NonNullable<LanyardData['spotify']> }) => {
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const { start, end } = spotify.timestamps;
  const duration = end - start;

  useEffect(() => {
    const updateProgress = () => {
      const now = Date.now();
      const current = Math.max(0, now - start);
      const percent = Math.max(0, Math.min(100, (current / duration) * 100));
      setProgress(percent);
      setCurrentTime(current);
    };
    updateProgress();
    const interval = setInterval(updateProgress, 1000);
    return () => clearInterval(interval);
  }, [start, duration]);

  return (
    <div className="inner-card">
      <img
        src={spotify.album_art_url}
        alt={spotify.album}
        className="shadow-xl"
        style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover' }}
      />
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-white truncate text-base">{spotify.song}</h4>
        <p className="text-sm text-white/70 truncate">{spotify.artist}</p>

        <div className="mt-4">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden relative">
            <motion.div
              className="absolute top-0 left-0 h-full rounded-full"
              style={{ background: '#1db954' }}
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] font-mono font-bold text-white/40 tabular-nums">{formatTime(currentTime)}</span>
            <span className="text-[10px] font-mono font-bold text-white/40 tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ActivityInner = ({ activity }: { activity: LanyardData['activities'][number] }) => {
  const isGame = activity.type === 0;
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const startTime = activity.timestamps?.start;
    if (!startTime) return;
    const update = () => {
      const now = Date.now();
      const diff = now - startTime;
      setElapsed(formatTime(diff));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activity.timestamps?.start]);

  return (
    <div className="inner-card">
      {activity.assets?.large_image ? (
        <img
          src={activity.assets.large_image.startsWith('mp:external')
            ? activity.assets.large_image.replace(/mp:external\/([^/]*)\/(http[s]?)\//, '$2://')
            : `https://cdn.discordapp.com/app-assets/${activity.application_id}/${activity.assets.large_image}.png`
          }
          alt={activity.name}
          className="shadow-xl"
          style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover' }}
        />
      ) : (
        <div className="icon-placeholder">
          {isGame ? <Gamepad2 size={24} className="text-indigo-400" /> : <Monitor size={24} className="text-blue-400" />}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-white truncate text-base">{activity.name}</h4>
        {activity.details && <p className="text-sm text-white/70 truncate">{activity.details}</p>}
        {activity.state && <p className="text-xs text-white/50 truncate mt-1">{activity.state}</p>}
        {elapsed && (
          <div className="flex items-center gap-2 mt-3 w-fit pr-3 py-1 rounded-full border border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-accent/10 rounded-full">
              <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
              <span className="text-[9px] font-black text-accent uppercase tracking-wider">ELAPSED</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-white/60 tabular-nums tracking-wider">{elapsed}</span>
          </div>
        )}
      </div>
    </div>
  );
};
