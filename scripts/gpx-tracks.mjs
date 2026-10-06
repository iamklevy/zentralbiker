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
