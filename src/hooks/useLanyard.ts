import { useEffect, useState, useCallback, useRef } from 'react';

export interface LanyardData {
  heartbeat_interval: number;
  discord_user: {
    username: string;
    public_flags: number;
    id: string;
    discriminator: string;
    avatar: string;
  };
  activities: Array<{
    type: number;
    state: string;
    name: string;
    id: string;
    details?: string;
    timestamps?: {
      start?: number;
      end?: number;
    };
    assets?: {
      large_image?: string;
      large_text?: string;
      small_image?: string;
      small_text?: string;
    };
    application_id?: string;
    sync_id?: string;
  }>;
  discord_status: 'online' | 'idle' | 'dnd' | 'offline';
  active_on_discord_web: boolean;
  active_on_discord_desktop: boolean;
  active_on_discord_mobile: boolean;
  listening_to_spotify: boolean;
  spotify?: {
    track_id: string;
    timestamps: {
      start: number;
      end: number;
    };
    song: string;
    artist: string;
    album_art_url: string;
    album: string;
  };
}

const LANYARD_WS = 'wss://api.lanyard.rest/socket';

export const useLanyard = (userId: string) => {
  const [data, setData] = useState<LanyardData | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<any>(null);

  const connect = useCallback(() => {
    const socket = new WebSocket(LANYARD_WS);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('Lanyard WebSocket connected');
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const { op, d } = message;

      if (op === 1) {
        // Hello (d is heartbeat interval)
        socket.send(JSON.stringify({ op: 2, d: { subscribe_to_id: userId } }));
        
        heartbeatRef.current = setInterval(() => {
          socket.send(JSON.stringify({ op: 3 }));
        }, d.heartbeat_interval);
      } else if (op === 0) {
        // Event (INIT_STATE or PRESENCE_UPDATE)
        setData(d);
      }
    };

    socket.onclose = () => {
      console.log('Lanyard WebSocket closed. Reconnecting...');
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      setTimeout(connect, 5000);
    };

    socket.onerror = (error) => {
      console.error('Lanyard WebSocket error:', error);
      socket.close();
    };
  }, [userId]);

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) socketRef.current.close();
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [connect]);

  return data;
};
