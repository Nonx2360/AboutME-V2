import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { exec } from 'node:child_process';

const REDIRECT_URI = 'http://127.0.0.1:8888/callback';
const SCOPES = ['user-read-currently-playing', 'user-read-playback-state'].join(' ');

function readEnv() {
  try {
    return readFileSync(new URL('../.env', import.meta.url), 'utf8');
  } catch {
    return '';
  }
}

const envRaw = readEnv();
const envValue = (key) => envRaw.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';

const clientId = process.env.SPOTIFY_CLIENT_ID || envValue('SPOTIFY_CLIENT_ID');
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || envValue('SPOTIFY_CLIENT_SECRET');

if (!clientId || !clientSecret) {
  console.error('Missing SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET in .env');
  process.exit(1);
}

const authUrl =
  `https://accounts.spotify.com/authorize?client_id=${clientId}` +
  `&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&scope=${encodeURIComponent(SCOPES)}`;

const server = createServer(async (req, res) => {
  console.log(`[${new Date().toLocaleTimeString()}] callback hit: ${req.url}`);
  const url = new URL(req.url ?? '/', REDIRECT_URI);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!code && !error) {
    console.log('Callback hit without a code — this URL must come from the Spotify consent page, do not open it manually.');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<h2>Nothing to see here.</h2><p>Go back to the terminal and open the <b>authorize</b> URL, then click Agree on Spotify.</p>');
    return;
  }

  if (!code) {
    res.end(`<h2>Authorization failed: ${error ?? 'no code returned'}</h2>`);
    console.error('Authorization failed:', error);
    process.exit(1);
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.refresh_token) {
    res.end('<h2>Token exchange failed — check the terminal.</h2>');
    console.error('Token exchange failed:', data);
    process.exit(1);
  }

  const line = `SPOTIFY_REFRESH_TOKEN=${data.refresh_token}`;
  const updated = /^SPOTIFY_REFRESH_TOKEN=.*$/m.test(envRaw)
    ? envRaw.replace(/^SPOTIFY_REFRESH_TOKEN=.*$/m, line)
    : `${envRaw.trimEnd()}\n${line}\n`;

  writeFileSync(new URL('../.env', import.meta.url), updated);

  res.end('<h2>Success! Refresh token saved to .env. You can close this tab.</h2>');
  console.log('\nRefresh token saved to .env');
  console.log('Restart your dev server (npm run dev) to pick it up.\n');

  server.close();
  process.exit(0);
});

server.on('error', (err) => {
  const code = err?.code ?? '';
  if (code === 'EADDRINUSE') {
    console.error('\nPort 8888 is already in use. Close whatever occupies it (or another copy of this script) and try again.');
    console.error('Check with: netstat -ano | findstr :8888');
  } else {
    console.error('\nServer error:', err);
  }
  process.exit(1);
});

server.listen(8888, () => {
  console.log('\n==========================================================');
  console.log(' KEEP THIS WINDOW OPEN until it says "Success".');
  console.log(' Waiting for the Spotify callback on http://localhost:8888 ...');
  console.log('==========================================================');
  console.log('A browser window should open. If not, visit this URL manually:\n');
  console.log(authUrl);
  console.log('');
  const open =
    process.platform === 'win32'
      ? exec(`start "" "${authUrl}"`)
      : process.platform === 'darwin'
        ? exec(`open "${authUrl}"`)
        : exec(`xdg-open "${authUrl}"`);
  open.on('error', () => {});
});
