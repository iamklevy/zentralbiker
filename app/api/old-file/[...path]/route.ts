import { mediaUrl } from "@/lib/media";

/**
 * A photo, PDF or music file at its old zentralbiker.ch address
 * ("/4fotos/images_highlights_asien/019 Pamir Highway - Tajikistan.JPG"),
 * reached through the rewrite in lib/old-site.ts: sends it on, for good, to
 * where the file lives now.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return new Response(null, {
    status: 301,
    headers: { Location: mediaUrl(path.join("/")), "Cache-Control": "public, max-age=86400" },
  });
}
