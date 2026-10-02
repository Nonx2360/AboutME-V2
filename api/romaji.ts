/**
 * Server-side Kuroshiro singleton for Japanese → Romaji conversion.
 *
 * Uses dynamic `import()` so Vite can tree-shake this module out of the
 * frontend bundle. The lazy initialization strategy means the kuromoji
 * dictionary (~3 MB) is only loaded when the first Japanese track appears.
 *
 * Within the same Vercel warm instance the kuroshiro singleton is reused.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KuroshiroInstance = any;

/** Shared Kuroshiro instance. null = not yet initialized. */
let kuroshiro: KuroshiroInstance = null;

/** Guard against concurrent inits. */
let initPromise: Promise<void> | null = null;

/** Japanese character detection regex (Hiragana + Katakana + common Kanji). */
const JP_REGEX = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/;

/** Returns true if the string contains Japanese characters. */
export function isJapanese(text: string): boolean {
  return JP_REGEX.test(text);
}

/**
 * Lazily initializes the Kuroshiro singleton using dynamic import.
 * Safe to call concurrently — only the first call starts the init.
 */
async function ensureInit(): Promise<void> {
  if (kuroshiro !== null) return;

  if (!initPromise) {
    initPromise = (async () => {
      // Dynamic imports keep Vite from bundling these CJS-only packages.
      // Their interop shape differs by bundler and runtime, so unwrap
      // defensively instead of assuming `default` is the constructor.
      const kuroshiroMod = await import('kuroshiro');
      const analyzerMod = await import('kuroshiro-analyzer-kuromoji');

      const Kuroshiro = unwrapDefault<new (options?: unknown) => KuroshiroInstance>(
        kuroshiroMod
      );
      const KuromojiAnalyzer = unwrapDefault<new () => unknown>(analyzerMod);

      if (typeof Kuroshiro !== 'function' || typeof KuromojiAnalyzer !== 'function') {
        throw new Error('kuroshiro interop failed to yield constructors');
      }

      const instance = new Kuroshiro();
      await instance.init(new KuromojiAnalyzer());
      kuroshiro = instance;
    })();
  }

  await initPromise;
}

/**
 * Resolves the actual constructor from a dynamic import of a CJS module.
 *
 * Depending on the bundler and runtime the constructor ends up at
 * `mod.default`, `mod.default.default`, or under a named export, so walk the
 * common shapes before giving up.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unwrapDefault<T>(mod: any): T {
  if (typeof mod === 'function') return mod as T;
  if (mod && typeof mod.default !== 'undefined') return unwrapDefault<T>(mod.default);
  for (const key of ['Kuroshiro', 'KuromojiAnalyzer', 'default']) {
    if (mod && typeof mod[key] === 'function') return mod[key] as T;
  }
  throw new Error('could not resolve constructor from dynamic import');
}

/**
 * Converts a Japanese lyric line to spaced Hepburn Romaji.
 * Returns `null` for non-Japanese lines — no kuroshiro init triggered.
 *
 * @example
 *   await getRomaji("笑いながら彼女はペンを叩いた")
 *   // → "Warai nagara kanojo wa pen o tataita"
 *
 *   await getRomaji("Hello world")
 *   // → null
 */
export async function getRomaji(line: string): Promise<string | null> {
  if (!isJapanese(line)) return null;

  await ensureInit();

  try {
    const raw: string = await kuroshiro.convert(line, {
      to: 'romaji',
      mode: 'spaced',
      romajiSystem: 'hepburn',
    });

    // Collapse multiple spaces and capitalize first letter
    const cleaned = raw.replace(/\s+/g, ' ').trim();
    return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : null;
  } catch (err) {
    console.error('[romaji] convert error:', err);
    return null;
  }
}
