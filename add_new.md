# Plan: Spotify Now Listening + Live Lyrics

## Goal

Add a web feature that targets my Spotify account, shows the song I am listening to now, and displays the current lyric line in sync with playback. The lyric line should transition smoothly into the next line with polished motion and a music-focused UI.

## Current Project Context

- Stack: Vite, React 19, TypeScript, Tailwind CSS 4, Framer Motion, Lucide React.
- Existing realtime source: `src/hooks/useLanyard.ts` already receives Discord/Lanyard Spotify status.
- Existing display area: `src/components/AboutMe.tsx` has a `Real-time Presence` section and a Spotify status card.
- Existing visual language: dark portfolio UI, animated starfield, accent-driven motion, glass/status cards.

## Product Behavior

- Show the currently playing Spotify track for my account.
- Show album art, song title, artist, album, playback progress, and play/pause state.
- Show the active lyric line based on the current playback timestamp.
- Show previous and next lyric lines with lower opacity for context.
- Animate lyric changes with Framer Motion:
  - Current line slides/fades upward into focus.
  - Previous line fades out and moves up.
  - Next line fades in below.
  - Use `AnimatePresence` with stable lyric timestamps as keys.
- If no song is playing, show a quiet empty state.
- If lyrics are unavailable, show track metadata and a graceful `Lyrics unavailable` state.

## Data Architecture

### Spotify Account Source

Use Spotify OAuth for my own account instead of relying only on Lanyard.

Required Spotify scopes:

- `user-read-currently-playing`
- `user-read-playback-state`

Required environment variables:

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REFRESH_TOKEN`

Backend/API endpoint:

- Add `api/spotify-now.ts` if deploying on Vercel serverless.
- Or add a small local backend endpoint if the project is not deployed on Vercel.

Endpoint responsibilities:

- Exchange refresh token for access token.
- Call Spotify `GET /v1/me/player/currently-playing`.
- Normalize the response into frontend-safe JSON.
- Never expose client secret or refresh token to the browser.

Normalized response shape:

```ts
type NowPlayingTrack = {
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
  fetchedAt: number;
  trackId: string;
  song: string;
  artist: string;
  album: string;
  albumArtUrl: string;
  spotifyUrl: string;
};
```

### Lyrics Source

Spotify Web API does not provide public synced lyrics, so add a lyrics provider layer.

Provider priority:

1. `LRCLIB` synced lyrics by artist + track + album + duration.
2. Local cached `.lrc` fallback for favorite tracks.
3. Plain unsynced lyrics fallback only if synced lyrics are unavailable.

Add endpoint:

- `api/lyrics.ts`

Lyrics endpoint responsibilities:

- Receive `artist`, `track`, `album`, `durationMs`, and `trackId`.
- Request synced lyrics from provider.
- Parse LRC timestamps into structured lyric lines.
- Cache results by `trackId` to avoid repeat requests.
- Return empty lyrics with a clear unavailable status when no match exists.

Normalized lyrics shape:

```ts
type SyncedLyricLine = {
  timeMs: number;
  text: string;
};

type LyricsResponse = {
  source: 'lrclib' | 'local' | 'none';
  synced: boolean;
  lines: SyncedLyricLine[];
};
```

## Frontend Implementation

### New Files

- `src/hooks/useSpotifyNow.ts`
- `src/hooks/useSyncedLyrics.ts`
- `src/components/SpotifyLyricsCard.tsx`
- `src/components/LyricLineStack.tsx`
- `src/utils/lyrics.ts`
- `src/types/spotify.ts`

### Hook: `useSpotifyNow`

- Poll `/api/spotify-now` every 8-12 seconds.
- Use local ticking between polls to keep progress smooth:
  - `displayProgressMs = progressMs + (Date.now() - fetchedAt)` while playing.
- Pause local ticking when `isPlaying` is false.
- Refetch immediately when tab regains visibility.
- Keep the last valid track briefly during loading to prevent visual flicker.

### Hook: `useSyncedLyrics`

- Fetch lyrics when `trackId` changes.
- Parse and memoize lyric lines.
- Determine active lyric index from `displayProgressMs`.
- Return:
  - `activeLine`
  - `previousLine`
  - `nextLine`
  - `activeIndex`
  - `hasSyncedLyrics`
  - `loading`

### Utility: `src/utils/lyrics.ts`

Functions:

- `parseLrc(lrc: string): SyncedLyricLine[]`
- `findActiveLyricIndex(lines, progressMs): number`
- `formatPlaybackTime(ms: number): string`

## UI/UX Direction From `ui-ux-pro-max`

Design system:

- Pattern: portfolio/status grid that keeps the existing page structure.
- Style: vibrant, block-based, energetic music UI.
- Colors:
  - Background: `#0F0F23`
  - Primary: `#1E1B4B`
  - Secondary: `#4338CA`
  - Spotify CTA/accent: `#22C55E`
  - Text: `#F8FAFC`
- Typography:
  - Keep current site fonts unless switching globally is desired.
  - For the new music card, use bold display treatment for the active lyric.
- Effects:
  - 200-300ms transitions.
  - Large lyric type.
  - Motion without layout shift.
  - Respect `prefers-reduced-motion`.

### Component Layout

Place inside `Real-time Presence`, replacing or upgrading the current Spotify card:

- Top row:
  - Spotify icon from Lucide or Simple Icons asset.
  - `Listening Now`
  - live pulse dot.
- Main body:
  - Album art on the left for desktop, top for mobile.
  - Song title, artist, album.
  - Playback progress bar.
  - Lyric stack as the visual focus.
- Footer:
  - Spotify open link.
  - Small source label: `Synced lyrics` or `Lyrics unavailable`.

### Lyric Transition Details

Use Framer Motion variants:

```ts
const lyricVariants = {
  enter: { opacity: 0, y: 18, filter: 'blur(6px)' },
  center: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -18, filter: 'blur(6px)' },
};
```

Rules:

- Active lyric has highest contrast and largest size.
- Previous/next lines are smaller and lower opacity.
- Keep lyric container height stable.
- No scale hover effects that shift layout.
- Add reduced-motion fallback to opacity-only changes.

## Integration Steps

1. Add Spotify OAuth setup documentation to `.env.example` or README.
2. Create the serverless Spotify endpoint.
3. Create the serverless lyrics endpoint.
4. Add shared Spotify/lyrics TypeScript types.
5. Add `useSpotifyNow`.
6. Add `useSyncedLyrics`.
7. Build `SpotifyLyricsCard`.
8. Build `LyricLineStack`.
9. Replace the existing Spotify block in `AboutMe.tsx`.
10. Keep Lanyard as a fallback if the Spotify API endpoint fails.
11. Add loading, unavailable, paused, and no-track states.
12. Add responsive styling in `src/index.css` or Tailwind classes.
13. Verify build and lint.

## Error And Fallback States

- Spotify token invalid:
  - Show `Spotify connection needs refresh`.
  - Log server-side error only.
- No active playback:
  - Show `No music playing...`.
- Lyrics unavailable:
  - Keep album art and progress visible.
  - Show a subtle unavailable message in the lyrics area.
- Provider timeout:
  - Return empty synced lyrics instead of blocking the card.
- Browser tab hidden:
  - Reduce polling.

## Security Notes

- Do not put Spotify client secret or refresh token in frontend code.
- Server endpoint must read secrets from environment variables only.
- Never commit `.env`.
- Lyrics provider calls should happen server-side if rate limits or keys are involved.

## Validation Checklist

- `npm run build`
- `npm run lint`
- Test with Spotify playing.
- Test with Spotify paused.
- Test with no active track.
- Test with a track that has synced lyrics.
- Test with a track that has no lyrics.
- Test mobile width at 375px.
- Test desktop at 1440px.
- Confirm no horizontal scroll.
- Confirm transitions respect `prefers-reduced-motion`.

## Implementation Order

1. Backend Spotify endpoint.
2. Lyrics endpoint and LRC parser.
3. React hooks.
4. Lyric UI component.
5. Replace current Spotify card.
6. Polish responsive layout and transitions.
7. Run build/lint and fix issues.
