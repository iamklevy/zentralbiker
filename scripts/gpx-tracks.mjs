/**
 * Which GPS tracks an old route page drew, shared by fetch-gpx.mjs and
 * build-tracks.mjs. A page names one file in its map div (gpxview:…) or
 * several in a drop-down, each with the section's name:
 *   <option value="map:532chile_01.gpx:OSMDE">1 Chile, Ollagüe bis Paso Sico</option>
 *
 * @param {string} html an old page from .mirror/5route/
 * @returns {{ file: string, label: string }[]} in the page's order
 */
export function pageTracks(html) {
  const tracks = new Map();
  for (const m of html.matchAll(/<option value="map:([^":]+\.gpx)[^"]*"[^>]*>([^<]*)/gi)) tracks.set(m[1], m[2].trim());
  for (const m of html.matchAll(/gpxview:([^":]+\.gpx)/gi)) if (!tracks.has(m[1])) tracks.set(m[1], "");
  return [...tracks].map(([file, label]) => ({ file, label }));
}

/* Line helpers, shared with build-routed-tracks.mjs. Points are [lat, lon, …]. */

const TOLERANCE = 0.0004; // degrees, ~40 m

/** Great-circle distance in km. */
export function km([lat1, lon1], [lat2, lon2]) {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

/** Douglas–Peucker, iterative so long days don't overflow the stack. */
export function simplify(points) {
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

export const round = (n) => Math.round(n * 1e5) / 1e5;
