/**
 * Turns the GPS tracks (see fetch-gpx.mjs) into the small line data the
 * route maps draw: content/generated/tracks.json.
 *
 * Per route page (keyed by its old file, as journey.json's `route` is), the
 * tracks it showed, each with its name, the distance ridden and its lines —
 * one per recorded day (<trkseg>), thinned with Douglas–Peucker to what is
 * visible on a map (~40 m) and rounded to 5 decimals (~1 m). Planned routes
 * (<rtept>) are drawn only for files that have nothing recorded.
 *
 * Usage: node scripts/build-tracks.mjs [.mirror]
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { pageTracks } from "./gpx-tracks.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = join(HERE, "..", process.argv[2] ?? ".mirror", "5route");
const OUT = join(HERE, "..", "content", "generated", "tracks.json");

const TOLERANCE = 0.0004; // degrees, ~40 m

/** Great-circle distance in km. */
function km([lat1, lon1], [lat2, lon2]) {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

/** Douglas–Peucker, iterative so long days don't overflow the stack. */
function simplify(points) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    const [ax, ay] = points[first];
    const [bx, by] = points[last];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1e-12;
    let worst = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = Math.abs(dy * (points[i][0] - ax) - dx * (points[i][1] - ay)) / len;
      if (d > worst) [worst, index] = [d, i];
    }
    if (worst > TOLERANCE) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

const round = (n) => Math.round(n * 1e5) / 1e5;

/**
 * The lines of a .gpx file: one per recorded <trkseg> — in practice one per
 * day — each point [lat, lon, ele?, time?]. A file with no recording (a few
 * were drawn by hand: China's Xinjiang and Gansu, Bolivia, Chile's first
 * section) gives its planned <rte>s instead, as the old map did.
 */
function segments(xml) {
  const num = (re, s) => {
    const m = re.exec(s);
    return m ? Number(m[1]) : undefined;
  };
  const lines = (open, close, point) =>
    xml
      .split(open)
      .slice(1)
      .map((part) =>
        [...part.split(close)[0].matchAll(point)].map(([, attrs, body = ""]) => [
          num(/lat="([-\d.]+)"/, attrs),
          num(/lon="([-\d.]+)"/, attrs),
          num(/<ele>([-\d.]+)<\/ele>/, body),
          /<time>([^<]+)<\/time>/.exec(body) ? Date.parse(/<time>([^<]+)<\/time>/.exec(body)[1]) : undefined,
        ]),
      )
      .filter((points) => points.length > 1);
  const recorded = lines(/<trkseg>/i, /<\/trkseg>/i, /<trkpt\b([^>]*?)(?:\/>|>([\s\S]*?)<\/trkpt>)/gi);
  return recorded.length
    ? { recorded: true, lines: recorded }
    : { recorded: false, lines: lines(/<rte>/i, /<\/rte>/i, /<rtept\b([^>]*?)(?:\/>|>([\s\S]*?)<\/rtept>)/gi) };
}

const lineKm = (line) => line.slice(1).reduce((s, p, i) => s + km(line[i], p), 0);

/**
 * What the old map's info box showed for a day, worked out from the full
 * recording: date, distance, time, speed, climb and the highest and lowest
 * point. Heights are smoothed (a change only counts once it passes 10 m) so
 * GPS jitter doesn't add up to phantom climbing.
 */
function dayInfo(line) {
  const info = { km: Math.round(lineKm(line) * 10) / 10 };
  const times = line.map((p) => p[3]).filter((t) => t !== undefined);
  if (times.length > 1) {
    // the date where they were: UTC shifted by the longitude's time zone
    const offset = Math.round(line[0][1] / 15) * 3600e3;
    info.date = new Date(times[0] + offset).toISOString().slice(0, 10);
    info.duration = Math.round((times[times.length - 1] - times[0]) / 60e3); // minutes
    // riding time: the stretches actually moving (over 2.5 km/h, no long
    // gaps). The speed uses only those stretches' kilometres: some days have
    // points without a time, which would otherwise count as ridden in no time.
    let [moving, movingKm] = [0, 0];
    for (let i = 1; i < line.length; i++) {
      const [a, b] = [line[i - 1], line[i]];
      if (a[3] === undefined || b[3] === undefined) continue;
      const hours = (b[3] - a[3]) / 3600e3;
      const d = km(a, b);
      if (hours > 0 && hours < 5 / 60 && d / hours > 2.5) [moving, movingKm] = [moving + hours, movingKm + d];
    }
    info.moving = Math.round(moving * 60);
    if (moving > 0) info.speed = Math.round((movingKm / moving) * 10) / 10;
  }
  const heights = line.map((p) => p[2]).filter((e) => e !== undefined);
  if (heights.length > 1) {
    let [up, down, ref] = [0, 0, heights[0]];
    for (const h of heights) {
      if (h - ref > 10) [up, ref] = [up + h - ref, h];
      else if (ref - h > 10) [down, ref] = [down + ref - h, h];
    }
    Object.assign(info, {
      up: Math.round(up),
      down: Math.round(down),
      // GPS heights wobble tens of metres around sea level on the coast:
      // nobody rode at -40 m, so the lowest point shown is sea level at worst
      min: Math.max(0, Math.round(Math.min(...heights))),
      max: Math.round(Math.max(...heights)),
    });
  }
  return info;
}

const result = {};
let points = 0;
for (const page of readdirSync(DIR).filter((f) => f.endsWith(".html")).sort()) {
  const tracks = pageTracks(readFileSync(join(DIR, page), "utf8")).filter((t) => existsSync(join(DIR, t.file)));
  if (!tracks.length) continue;
  result[`5route/${page}`] = tracks.map(({ file, label }) => {
    const { recorded, lines } = segments(readFileSync(join(DIR, file), "utf8"));
    const distance = lines.reduce((sum, line) => sum + lineKm(line), 0);
    const thin = lines.map((line) => simplify(line).map(([lat, lon]) => [round(lat), round(lon)]));
    points += thin.reduce((n, l) => n + l.length, 0);
    // a planned route's lines are not days: they only get their distance
    const info = lines.map((line) => (recorded ? dayInfo(line) : { km: Math.round(lineKm(line) * 10) / 10 }));
    return { file, label, km: Math.round(distance), lines: thin, info };
  });
  console.log(page.padEnd(24), result[`5route/${page}`].map((t) => `${t.km} km/${t.lines.length}d`).join(" + "));
}
writeFileSync(OUT, JSON.stringify(result));
console.log(`\n${Object.keys(result).length} pages, ${points} points, ${(JSON.stringify(result).length / 1e3).toFixed(0)} kB`);
