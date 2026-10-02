/**
 * Makes the film "posters": one frame from each video in images/filme,
 * scaled to fit 360x360, at public/media/prints/images/filme/<name>.jpg —
 * the same place and size as the gallery prints (see build-prints.mjs). The
 * old site's stills (*_Bild.jpg) are only 95x71, far too small for a print.
 *
 * The frame is taken a third of the way in, past the shaky start. Existing
 * posters are skipped; delete one to make it again. Afterwards run
 * `npm run upload-media` to put the new files in the storage bucket.
 *
 * Usage: node scripts/build-posters.mjs
 */
import { readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ffmpeg from "ffmpeg-static";
import sharp from "sharp";

import { printPath } from "../lib/print-path.mjs";

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const MEDIA = join(HERE, "..", "public", "media");
const FILMS = "images/filme";
const PARALLEL = 4;

const todo = readdirSync(join(MEDIA, FILMS))
  .filter((f) => f.toLowerCase().endsWith(".mp4"))
  .map((f) => `${FILMS}/${f}`)
  .filter((src) => !existsSync(join(MEDIA, printPath(src))));

/** Length of a video in seconds, read from ffmpeg's own report. */
async function duration(file) {
  // With no output ffmpeg exits with an error, but still prints the header.
  const { stderr } = await run(ffmpeg, ["-hide_banner", "-i", file]).catch((e) => e);
  const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(stderr ?? "");
  return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0;
}

let done = 0;
let failed = 0;
async function worker() {
  for (let src; (src = todo.shift()); ) {
    const file = join(MEDIA, src);
    const out = join(MEDIA, printPath(src));
    try {
      const at = (await duration(file)) / 3;
      const { stdout } = await run(
        ffmpeg,
        ["-hide_banner", "-loglevel", "error", "-ss", at.toFixed(2), "-i", file, "-frames:v", "1", "-f", "image2pipe", "-c:v", "png", "-"],
        { encoding: "buffer", maxBuffer: 64 * 1024 * 1024 },
      );
      mkdirSync(dirname(out), { recursive: true });
      await sharp(stdout)
        .resize(360, 360, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 74, mozjpeg: true })
        .toFile(out);
      done++;
    } catch (e) {
      failed++;
      console.error(`  ${src}: ${e.message}`);
    }
  }
}

const total = todo.length;
await Promise.all(Array.from({ length: PARALLEL }, worker));
console.log(`posters: ${done} made, ${failed} failed, ${total === 0 ? "all already there" : `${total} needed`}`);
if (failed) process.exit(1);
