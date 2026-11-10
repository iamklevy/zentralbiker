/**
 * The music mix that played over each leg's highlights on the old site
 * (files in the media bucket; durations in seconds). Plain data, so both the
 * page (server) and the slideshow (client) can read it.
 */
export const HIGHLIGHT_MIXES: Record<string, { file: string; duration: number }> = {
  "highlights-amerika": { file: "4fotos/audios/amerika_mix.mp3", duration: 1260 },
  "highlights-asien": { file: "4fotos/audios2/asien_mix.mp3", duration: 1158 },
  "highlights-ozeanien": { file: "4fotos/audios3/ozeanien_mix.mp3", duration: 1212 },
};

/** Whether a gallery plays as a slideshow over its music. */
export function hasHighlightsShow(slug: string): boolean {
  return slug in HIGHLIGHT_MIXES;
}
