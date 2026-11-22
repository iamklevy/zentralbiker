/**
 * Storage key for a mirrored file, e.g. "4fotos/images_highlights_amerika/
 * 030 Brüllaffen - Costa Rica.JPG" -> "... 030 Bruellaffen - Costa Rica.JPG".
 *
 * Supabase Storage only accepts ASCII keys, and 57 of the old file names carry
 * umlauts. Shared by scripts/upload-media.mjs (which uploads under this key)
 * and lib/media.ts (which builds the URL), so the two can never disagree.
 *
 * @param {string} path path relative to the media root, not URL-encoded
 * @returns {string}
 */
export function mediaKey(path) {
  return path
    .normalize("NFC")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/Ä/g, "Ae")
    .replace(/Ö/g, "Oe")
    .replace(/Ü/g, "Ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w/!\-.*'() &$@=;:+,]/g, "_");
}
