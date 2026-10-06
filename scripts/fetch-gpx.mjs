/**
 * Downloads the GPS tracks the old route pages drew on their maps.
 *
 * The old Asia and Oceania pages loaded a .gpx file per country (or per
 * section: Chile, New Zealand, China) into a map script; the mirror never
 * fetched them. This reads which files the pages used (see gpx-tracks.mjs)
 * and downloads them from the live old site into .mirror/5route/, next to
 * the pages. Files already there are skipped. Then run build-tracks.mjs.
 *
 * Usage: node scripts/fetch-gpx.mjs [.mirror]
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { pageTracks } from "./gpx-tracks.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = join(HERE, "..", process.argv[2] ?? ".mirror", "5route");
const BASE = "https://www.zentralbiker.ch/5route/";

const files = new Set(
  readdirSync(DIR)
    .filter((f) => f.endsWith(".html"))
    .flatMap((f) => pageTracks(readFileSync(join(DIR, f), "utf8")).map((t) => t.file)),
);

let fetched = 0;
for (const file of files) {
  const target = join(DIR, file);
  if (existsSync(target)) continue;
  const res = await fetch(BASE + file);
  if (!res.ok) {
    console.warn(`  ${file}: HTTP ${res.status}`);
    continue;
  }
  const body = Buffer.from(await res.arrayBuffer());
  writeFileSync(target, body);
  console.log(`${file}  ${(body.length / 1e6).toFixed(1)} MB`);
  fetched++;
}
console.log(`\n${fetched} downloaded, ${files.size} tracks in all.`);
