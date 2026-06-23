import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanyard } from '../hooks/useLanyard';
import { Music, Gamepad2 } from 'lucide-react';
import { SpotifyInner, ActivityInner } from '../components/SharedComponents';

export const OverlayView = () => {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('id') || '908945543223463997';
  const showSpotify = searchParams.get('spotify') !== 'false';
  const showActivity = searchParams.get('activity') !== 'false';
  
  const data = useLanyard(userId);

  useEffect(() => {
    document.documentElement.classList.add('overlay');
    return () => document.documentElement.classList.remove('overlay');
  }, []);

  if (!data) return null;

  const { spotify, activities } = data;
  const filteredActivities = activities.filter((a) => a.type !== 4 && a.name !== 'Spotify');

  return (
    <div className="overlay-container">
      <div className="flex flex-col gap-4 max-w-[400px]">
        {showSpotify && spotify && (
          <div className="sketch-card overlay-card">
             <div className="card-title text-sm">
                <div className="icon-circle icon-spotify mini">
                   <Music size={14} />
                </div>
                Vibing To
             </div>
             <SpotifyInner spotify={spotify} />
          </div>
        )}

        {showActivity && filteredActivities.length > 0 && (
          <div className="sketch-card overlay-card">
             <div className="card-title text-sm">
                <div className="icon-circle icon-playing mini">
                   <Gamepad2 size={14} />
                </div>
                Playing / Coding
             </div>
             {filteredActivities.map((activity, idx) => (
                <ActivityInner key={idx} activity={activity} />
             ))}
          </div>
        )}
      </div>
    </div>
  );
};
