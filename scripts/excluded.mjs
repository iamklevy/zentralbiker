/**
 * Parts of the old site that are deliberately not migrated. The mirror still
 * has some of them, so every migration script filters through this list —
 * otherwise `npm run migrate` would bring them straight back.
 *
 * - The Egypt photo gallery (/fotos/aegypten): removed from the site, and its
 *   photos deleted from public/media, the mirror and the storage bucket.
 *   The Egypt newsletter (7varia/13_aegypten.pdf) is a different thing and stays.
 */

/** Mirror pages that are never migrated. */
export const EXCLUDED_PAGES = new Set(["4fotos/400f_aegypten.html", "4fotos/436aegypten.html"]);

/** New-site paths of those pages; links to them are removed from other pages. */
export const EXCLUDED_PATHS = new Set(["/fotos/aegypten"]);

/** Mirror files (photos, thumbnails) that are never migrated. */
const EXCLUDED_ASSETS = [
  /^4fotos\/436(?:photos|thumbnails)_aegypten\//,
  /^4fotos\/galeriebilder\/36aegypten\.jpg$/,
  /^images\/web\/aegypten\.jpg$/,
];

export const isExcludedAsset = (path) => EXCLUDED_ASSETS.some((re) => re.test(path));

/** The mirror's manifest without the excluded pages and files. */
export function withoutExcluded(manifest) {
  return {
    ...manifest,
    pages: Object.fromEntries(Object.entries(manifest.pages).filter(([p]) => !EXCLUDED_PAGES.has(p))),
    assets: manifest.assets.filter((a) => !isExcludedAsset(a)),
  };
}
