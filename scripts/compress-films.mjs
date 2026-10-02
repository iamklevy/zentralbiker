/**
 * Re-encodes the films (images/filme/*.mp4) so they fit in the storage
 * bucket: the old files are H.264 Baseline at ~3 Mbit/s, which H.264 High at
 * CRF 26 brings down by about half overall (up to 90% for some) with no
 * visible loss at their 640px size.
 * The index is moved to the front (faststart) so playback starts before the
 * whole file has loaded.
 *
 * A few films were already encoded lean and come out no smaller, or even
 * bigger; for those the original is kept (copied as it is).
 *
 * The originals are left alone (public/media holds the only copy); the new
 * files go to .compressed/images/filme/. Existing outputs are skipped.
 *
 * Usage: node scripts/compress-films.mjs
 */
import { readdirSync, existsSync, mkdirSync, statSync, renameSync, copyFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ffmpeg from "ffmpeg-static";

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const FILMS = "images/filme";
const SRC = join(ROOT, "public", "media", FILMS);
const OUT = join(ROOT, ".compressed", FILMS);
const PARALLEL = 3; // x264 already uses several cores per film
const WORTH_IT = 0.9; // keep the re-encode only if it saves at least 10%

mkdirSync(OUT, { recursive: true });
const films = readdirSync(SRC).filter((f) => f.toLowerCase().endsWith(".mp4"));
const todo = films.filter((f) => !existsSync(join(OUT, f)));

let failed = 0;
async function worker() {
  for (let f; (f = todo.shift()); ) {
    const tmp = join(OUT, `${f}.part.mp4`);
    try {
      await run(ffmpeg, [
        "-hide_banner", "-loglevel", "error", "-y",
        "-i", join(SRC, f),
        "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-profile:v", "high", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "96k",
        "-movflags", "+faststart",
        tmp,
      ]);
      // only a finished file gets the real name, so a stopped run resumes cleanly
      if (statSync(tmp).size < statSync(join(SRC, f)).size * WORTH_IT) {
        renameSync(tmp, join(OUT, f));
        console.log(`  ${f}`);
      } else {
        rmSync(tmp);
        copyFileSync(join(SRC, f), join(OUT, f));
        console.log(`  ${f} (kept the original, it was no bigger)`);
      }
    } catch (e) {
      failed++;
      console.error(`  ${f}: ${e.message}`);
    }
  }
}

await Promise.all(Array.from({ length: PARALLEL }, worker));

const mb = (dir) => films.reduce((sum, f) => sum + (existsSync(join(dir, f)) ? statSync(join(dir, f)).size : 0), 0) / 1048576;
console.log(`films: ${films.length - failed} of ${films.length}, ${mb(SRC).toFixed(1)} MB -> ${mb(OUT).toFixed(1)} MB`);
if (failed) process.exit(1);
