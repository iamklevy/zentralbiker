import { mediaKey } from "./media-key.mjs";

/**
 * Where the photos and PDFs are served from. Set NEXT_PUBLIC_MEDIA_URL to the
 * public Supabase Storage bucket (see scripts/upload-media.mjs); without it the
 * site falls back to the local copy in public/media.
 */
const BASE = (process.env.NEXT_PUBLIC_MEDIA_URL || "/media").replace(/\/+$/, "");
const REMOTE = BASE !== "/media";

/** URL of a mirrored file, given its path relative to the media root. */
export function mediaUrl(path: string): string {
  const key = REMOTE ? mediaKey(path) : path;
  return `${BASE}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

/** Points every /media/... src and href in migrated page HTML at the bucket. */
export function rewriteMediaHtml(html: string): string {
  if (!REMOTE) return html;
  return html.replace(/(\s(?:src|href)=")\/media\/([^"]+)"/g, (_, attr: string, raw: string) => {
    let path = raw.replace(/&amp;/g, "&");
    try {
      path = decodeURI(path);
    } catch {
      // leave malformed escapes as they are
    }
    return `${attr}${mediaUrl(path).replace(/&/g, "&amp;")}"`;
  });
}
