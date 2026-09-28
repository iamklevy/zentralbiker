/**
 * Uploads public/media (photos, thumbnails, banners, PDFs, videos, audio) to a public
 * Supabase Storage bucket, so the site can serve them from there instead of
 * shipping ~700 MB with every deploy.
 *
 * Files keep their paths; only non-ASCII names are transliterated (see
 * lib/media-key.mjs), which lib/media.ts applies the same way when it builds
 * the URL. Files already in the bucket are skipped, so a run that was
 * interrupted can simply be started again.
 *
 * Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local. When it is
 * done, set NEXT_PUBLIC_MEDIA_URL to the URL it prints.
 *
 * The 46 videos (images/filme/*.mp4, ~360 MB) would push the bucket past the
 * free plan's 1 GB, so they are left out for now with --skip=mp4.
 *
 * Usage: node scripts/upload-media.mjs [--skip=mp4,...]
 */
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

import { mediaKey } from "../lib/media-key.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const SRC = join(ROOT, "public", "media");
const BUCKET = "media";
const PARALLEL = 6;
const SKIP = new Set(
  (process.argv.find((a) => a.startsWith("--skip="))?.slice("--skip=".length) ?? "")
    .split(",")
    .filter(Boolean)
    .map((e) => "." + e.replace(/^\./, "").toLowerCase()),
);

if (existsSync(join(ROOT, ".env.local"))) process.loadEnvFile(join(ROOT, ".env.local"));
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set in .env.local.");
  process.exit(1);
}
if (!existsSync(SRC)) {
  console.error("public/media is missing — run `npm run sync-media` first.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".gpx": "application/gpx+xml",
};

async function walk(dir, base = "") {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...(await walk(join(dir, entry.name), rel)));
    else if (TYPES[extname(entry.name).toLowerCase()] && !SKIP.has(extname(entry.name).toLowerCase())) out.push(rel);
  }
  return out;
}

/** Every file name already in one bucket folder. */
async function listFolder(folder) {
  const names = new Set();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(BUCKET).list(folder, { limit: 1000, offset });
    if (error) throw error;
    for (const f of data) if (f.id) names.add(f.name);
    if (data.length < 1000) return names;
  }
}

// 1. The bucket: public, so the pictures load without signed URLs.
const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
if (bucketsError) throw bucketsError;
if (!buckets.some((b) => b.name === BUCKET)) {
  const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
  if (error) throw error;
  console.log(`created public bucket "${BUCKET}"`);
}

// 2. What to upload, and a guard against two names mapping to one key.
const files = (await walk(SRC)).map((rel) => ({ rel, key: mediaKey(rel) }));
const seen = new Map();
for (const f of files) {
  if (seen.has(f.key)) {
    console.error(`two files map to the same key "${f.key}":\n  ${seen.get(f.key)}\n  ${f.rel}`);
    process.exit(1);
  }
  seen.set(f.key, f.rel);
}

// 3. Skip what is already there.
const folders = [...new Set(files.map((f) => dirname(f.key)).map((d) => (d === "." ? "" : d)))];
const present = new Set();
for (const folder of folders) {
  for (const name of await listFolder(folder)) present.add(folder ? `${folder}/${name}` : name);
}
const todo = files.filter((f) => !present.has(f.key));
console.log(`${files.length} files, ${files.length - todo.length} already uploaded, ${todo.length} to go`);

// 4. Upload, a few at a time, retrying transient failures.
let done = 0;
let bytes = 0;
const failed = [];

async function upload({ rel, key: objectKey }) {
  const body = await readFile(join(SRC, rel));
  for (let attempt = 1; ; attempt++) {
    const { error } = await supabase.storage.from(BUCKET).upload(objectKey, body, {
      contentType: TYPES[extname(rel).toLowerCase()],
      cacheControl: "31536000",
      upsert: true,
    });
    if (!error) break;
    if (attempt === 3) {
      failed.push(`${rel}: ${error.message}`);
      return;
    }
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
  bytes += body.length;
  if (++done % 100 === 0) console.log(`  ${done}/${todo.length} (${(bytes / 1024 / 1024).toFixed(0)} MB)`);
}

const queue = [...todo];
await Promise.all(
  Array.from({ length: PARALLEL }, async () => {
    while (queue.length) await upload(queue.shift());
  }),
);

console.log(`uploaded ${done}, ${(bytes / 1024 / 1024).toFixed(1)} MB`);
if (failed.length) {
  console.error(`${failed.length} failed — run the script again to retry them:`);
  for (const f of failed.slice(0, 20)) console.error("  " + f);
  process.exit(1);
}
console.log(`\nAll media is in Supabase. Add this to .env.local (and your host's env):`);
console.log(`NEXT_PUBLIC_MEDIA_URL=${url.replace(/\/+$/, "")}/storage/v1/object/public/${BUCKET}`);
