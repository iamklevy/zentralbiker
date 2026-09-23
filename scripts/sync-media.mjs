/**
 * Copies the mirrored images/PDFs into public/media, where the migrated
 * content expects them (extract.mjs rewrites every src/href to /media/...).
 *
 * public/media is gitignored on purpose: it is ~600 MB of photographs, which
 * does not belong in the repository and would blow past most platforms'
 * deploy size limits. Treat it as a build input — run this script on a fresh
 * clone, or point /media at object storage and skip it entirely.
 *
 * Usage: node scripts/sync-media.mjs <path-to-mirror>
 */
import { cp, mkdir, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEST = join(HERE, "..", "public", "media");
const MIRROR = process.argv[2];

if (!MIRROR || !existsSync(MIRROR)) {
  console.error("usage: node scripts/sync-media.mjs <path-to-mirror>");
  process.exit(1);
}

/** Only these ever get referenced by the migrated pages. */
const KEEP = /\.(jpe?g|png|gif|ico|pdf|svg)$/i;

async function walk(dir, base = "") {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...(await walk(join(dir, entry.name), rel)));
    else if (KEEP.test(entry.name)) out.push(rel);
  }
  return out;
}

const files = await walk(MIRROR);
console.log(`syncing ${files.length} files -> public/media`);

let copied = 0;
let skipped = 0;
let bytes = 0;

for (const rel of files) {
  const from = join(MIRROR, rel);
  const to = join(DEST, rel);
  const src = await stat(from);

  // Skip files already synced at the same size — makes re-runs cheap while
  // the mirror is still downloading.
  if (existsSync(to) && (await stat(to)).size === src.size) {
    skipped++;
    continue;
  }
  await mkdir(dirname(to), { recursive: true });
  await cp(from, to);
  copied++;
  bytes += src.size;
}

console.log(`copied ${copied}, already present ${skipped}, ${(bytes / 1024 / 1024).toFixed(1)} MB written`);
