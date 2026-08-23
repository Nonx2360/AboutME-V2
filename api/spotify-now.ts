import type { IncomingMessage, ServerResponse } from 'http';

interface VercelRequest extends IncomingMessage {
  query?: Record<string, string>;
}

interface VercelResponse extends ServerResponse {
  status(code: number): VercelResponse;
  json(data: unknown): VercelResponse;
  send(data: unknown): VercelResponse;
}

interface TokenResponse {
  access_token: string;
  error?: string;
  error_description?: string;
}

interface SpotifyCurrentlyPlaying {
  is_playing: boolean;
  progress_ms: number;
  item: {
    id: string;
    duration_ms: number;
    name: string;
    artists: Array<{ name: string }>;
    album: {
      name: string;
      images: Array<{ url: string }>;
    };
    external_urls: {
      spotify: string;
    };
  } | null;
}

const NOW_PLAYING_ENDPOINT = `https://api.spotify.com/v1/me/player/currently-playing`;
const TOKEN_ENDPOINT = `https://accounts.spotify.com/api/token`;

function getSpotifyEnv() {
  return {
    client_id: process.env.SPOTIFY_CLIENT_ID,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET,
    refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
  };
}

async function getAccessToken(client_id: string, client_secret: string, refresh_token: string) {
  const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refresh_token || '',
    }),
  });

  return response.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { client_id, client_secret, refresh_token } = getSpotifyEnv();

  if (!client_id || !client_secret || !refresh_token) {
    console.error('Missing Spotify environment variables');
    return res.status(500).json({ error: 'Spotify environment variables are not configured' });
  }

  try {
    const tokenResponse = (await getAccessToken(client_id, client_secret, refresh_token)) as TokenResponse;
    if (tokenResponse.error) {
      console.error('Spotify token exchange failed:', tokenResponse);
      return res.status(401).json({ error: 'Spotify connection needs refresh', details: tokenResponse.error_description });
    }

    const { access_token } = tokenResponse;

    const response = await fetch(NOW_PLAYING_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (response.status === 204) {
      return res.status(200).json({ isPlaying: false });
    }

    if (response.status > 400) {
      console.error(`Spotify API error response: ${response.status}`);
      return res.status(200).json({ isPlaying: false });
    }

    const song = (await response.json()) as SpotifyCurrentlyPlaying;

    if (song.item === null || !song.is_playing) {
      return res.status(200).json({ isPlaying: false });
    }

    const track = {
      isPlaying: song.is_playing,
      progressMs: song.progress_ms,
      durationMs: song.item.duration_ms,
      fetchedAt: Date.now(),
      trackId: song.item.id,
      song: song.item.name,
      artist: song.item.artists.map((_artist: { name: string }) => _artist.name).join(', '),
      album: song.item.album.name,
      albumArtUrl: song.item.album.images[0]?.url || '',
      spotifyUrl: song.item.external_urls.spotify,
    };

    // Cache control
    res.setHeader('Cache-Control', 'public, s-maxage=1, stale-while-revalidate=1');

    return res.status(200).json(track);
  } catch (error: unknown) {
    console.error('Error fetching Spotify now playing:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: 'Error fetching Spotify status', message });
  }
}

