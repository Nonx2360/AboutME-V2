/**
 * Type declarations for kuroshiro and its kuromoji analyzer.
 * These packages ship no TypeScript types; we declare them as `any` to unblock the build.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare module 'kuroshiro' {
  const Kuroshiro: any;
  export default Kuroshiro;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare module 'kuroshiro-analyzer-kuromoji' {
  const KuromojiAnalyzer: any;
  export default KuromojiAnalyzer;
}
