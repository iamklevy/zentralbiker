/**
 * Makes the gallery "prints": every gallery photo scaled to fit 360x360, at
 * public/media/prints/<original path>. The galleries show their thumbnails
 * as ~180px prints, which the old 120x90 thumbnails are too small for, and
 * the full photos (~180 KB each, up to 299 per gallery) far too heavy.
 * 360px keeps them sharp on high-density screens at ~20 KB each.
 *
 * Existing prints are skipped, so this is cheap to re-run. Afterwards run
 * `npm run upload-media` to put the new files in the storage bucket.
 *
 * Usage: node scripts/build-prints.mjs
 */
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import { printPath } from "../lib/print-path.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const MEDIA = join(HERE, "..", "public", "media");
const PARALLEL = 8;

const galleries = JSON.parse(readFileSync(join(HERE, "..", "content", "generated", "galleries.json"), "utf8"));
const todo = Object.values(galleries)
  .flatMap((g) => g.items.map((i) => i.src))
  .filter((src) => !existsSync(join(MEDIA, printPath(src))));

let done = 0;
let failed = 0;
async function worker() {
  for (let src; (src = todo.shift()); ) {
    const out = join(MEDIA, printPath(src));
    try {
      mkdirSync(dirname(out), { recursive: true });
      await sharp(join(MEDIA, src))
        .rotate() // honour EXIF orientation
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
console.log(`prints: ${done} made, ${failed} failed, ${total === 0 ? "all already there" : `${total} needed`}`);
if (failed) process.exit(1);
