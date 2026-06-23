import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { IncomingMessage, ServerResponse } from 'http'
import spotifyNowHandler from './api/spotify-now'
import lyricsHandler from './api/lyrics'

interface VercelRequest extends IncomingMessage {
  query?: Record<string, string>;
}

interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => VercelResponse;
  send: (data: unknown) => VercelResponse;
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables from the workspace directory
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'api-dev-server',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const url = req.url || '';
            
            // local wrapper to match Vercel Request & Response helper methods
            const wrapReqRes = (request: VercelRequest, response: VercelResponse) => {
              if (!request.query) {
                const parsedUrl = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
                const query: Record<string, string> = {};
                parsedUrl.searchParams.forEach((val, key) => {
                  query[key] = val;
                });
                request.query = query;
              }
              if (!response.status) {
                response.status = (code: number) => {
                  response.statusCode = code;
                  return response;
                };
              }
              if (!response.json) {
                response.json = (data: unknown) => {
                  response.setHeader('Content-Type', 'application/json');
                  response.end(JSON.stringify(data));
                  return response;
                };
              }
              if (!response.send) {
                response.send = (data: unknown) => {
                  response.end(typeof data === 'string' ? data : JSON.stringify(data));
                  return response;
                };
              }
            };

            if (url.startsWith('/api/spotify-now')) {
              const request = req as VercelRequest;
              const response = res as VercelResponse;
              wrapReqRes(request, response);
              try {
                await spotifyNowHandler(request, response);
              } catch (e: unknown) {
                console.error('Local Spotify Dev API error:', e);
                const errorMessage = e instanceof Error ? e.message : 'Unknown error';
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: errorMessage }));
              }
            } else if (url.startsWith('/api/lyrics')) {
              const request = req as VercelRequest;
              const response = res as VercelResponse;
              wrapReqRes(request, response);
              try {
                await lyricsHandler(request, response);
              } catch (e: unknown) {
                console.error('Local Lyrics Dev API error:', e);
                const errorMessage = e instanceof Error ? e.message : 'Unknown error';
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: errorMessage }));
              }
            } else {
              next();
            }
          });
        }
      }
    ],
  };
})


