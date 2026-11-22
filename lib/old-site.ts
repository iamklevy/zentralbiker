import type { NextConfig } from "next";

// Relative imports: next.config.ts loads this file, and the "@/" alias is not
// set up there.
import pages from "../content/generated/pages.json";
import { EXCLUDED_PAGES } from "../scripts/excluded.mjs";

type Redirect = Awaited<ReturnType<NonNullable<NextConfig["redirects"]>>>[number];
type Rewrite = { source: string; destination: string };

/**
 * Addresses of the old zentralbiker.ch, kept working after the new site took
 * over the domain: search results and other people's links point at them.
 *
 * Pages: every old page ("4fotos/400_highlights_asien.html") moves for good
 * to its new path ("/fotos/highlights-asien"). The old site was German only,
 * so they land on the German page. The galleries removed on purpose (see
 * scripts/excluded.mjs) go to the photo overview instead of a 404.
 */
export function oldPageRedirects(): Redirect[] {
  const moved: Redirect[] = Object.values(pages).map((p) => ({
    source: `/${p.oldPath}`,
    destination: p.path,
    statusCode: 301,
  }));
  const removed: Redirect[] = [...EXCLUDED_PAGES].map((oldPath) => ({
    source: `/${oldPath}`,
    destination: "/fotos",
    statusCode: 301,
  }));
  // Any other old page in a section's folder (one the migration never saw)
  // goes to that section rather than to a missing file in the bucket. Listed
  // last, so the exact matches above win.
  const unknown: Redirect[] = Object.entries(OLD_SECTIONS).map(([dir, section]) => ({
    source: `/${dir}/:page([^/]+\\.html?)`,
    destination: section,
    statusCode: 301,
  }));
  return [...moved, ...removed, ...unknown];
}

/** The old site's section folders and the new section each became. */
const OLD_SECTIONS: Record<string, string> = {
  "1home": "/",
  "2ausruestung": "/ausruestung",
  "3berichte": "/berichte",
  "4fotos": "/fotos",
  "5route": "/route",
  "6info": "/info",
  "7varia": "/varia",
};

/** The old site's folders; its photos, PDFs and music lived under these. */
const OLD_DIRS = [...Object.keys(OLD_SECTIONS), "images"];

/**
 * Files: anything else under an old folder is handed to /api/old-file, which
 * redirects to the same file in the media bucket. A plain redirect can't do
 * it, because the bucket stores umlaut names transliterated (lib/media-key.mjs).
 * Runs after the filesystem, so files this site serves itself (the banners in
 * public/images) are untouched.
 */
export function oldFileRewrites(): Rewrite[] {
  return [
    {
      source: `/:dir(${OLD_DIRS.join("|")})/:path*`,
      destination: "/api/old-file/:dir/:path*",
    },
  ];
}
