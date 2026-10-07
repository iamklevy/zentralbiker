/**
 * Draws the American leg on the route maps: content/generated/routed-tracks.json.
 *
 * Those pages never had GPS tracks, only a mapz.com picture and the stops
 * ridden ("Burlingame – Half Moon Bay – … – San Diego / 1'390 km"). Each stop
 * is looked up on OpenStreetMap (Nominatim) and every hop between two stops is
 * routed along roads by the OSM bicycle router: an approximation of the ride,
 * shaped like tracks.json (one line per hop, `info` only its km) and marked
 * `planned`. A hop the router can't do, or only by a long detour (the train
 * to Aguas Calientes, a ferry), is drawn straight and marked `straight`.
 *
 * Found places are kept in content/generated/route-places.json, so a rerun
 * asks Nominatim only for new stops; a wrong one can be fixed there by hand.
 *
 * Usage: node scripts/build-routed-tracks.mjs [.mirror]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "node-html-parser";

import { km, round, simplify } from "./gpx-tracks.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = join(HERE, "..", process.argv[2] ?? ".mirror", "5route");
const OUT = join(HERE, "..", "content", "generated", "routed-tracks.json");
const PLACES = join(HERE, "..", "content", "generated", "route-places.json");

const AGENT = "zentralbiker.ch route map builder (one-off, cached)";

/**
 * The pages, each with the box its stops lie in (west, south, east, north;
 * border towns included): a plain "Carmel" or "Cambria" is otherwise found in
 * Indiana or Pennsylvania.
 */
const PAGES = {
  "501kalifornien.html": [-124.5, 32.4, -114, 42],
  "503guatemala.html": [-92.3, 13.6, -88.1, 17.9],
  "504honduras.html": [-90, 12.9, -83, 16.5],
  "505nicaragua.html": [-88, 10.6, -83, 15.1],
  "506costa_rica.html": [-86.5, 8, -82.5, 11.3],
  "507panama.html": [-83.1, 7.1, -77.1, 9.7],
  "508florida.html": [-82, 24.4, -79.9, 26.5],
  "509ecuador.html": [-81.1, -5.1, -75.1, 1.5],
  "510peru.html": [-81.4, -18.4, -68.6, -3.3],
  "511bolivien.html": [-70, -23, -57.4, -9.6],
  "512paraguay.html": [-62.7, -27.7, -54.2, -19.2],
  "513argentinien.html": [-59, -30.5, -53.5, -25.5],
  "514uruguay.html": [-58.5, -35, -53, -30],
};

/**
 * Stops the pages misspell or Nominatim can't find by their written name:
 * the query to ask instead, or the place itself as [lat, lon].
 */
const QUERIES = {
  // towns Nominatim gives as the middle of their county or region
  "Santa Cruz|501kalifornien.html": [36.9741, -122.0308],
  Monterey: [36.6002, -121.8947],
  Puntarenas: [9.9763, -84.8384],
  "Puerto Limon": [9.9907, -83.036],
  Ayaviri: [-14.8818, -70.5901],
  Puno: [-15.8402, -70.0219],
  Loja: [-3.9931, -79.2042],
  Saraguro: [-3.6206, -79.2372],
  // places no map knows by that name: left out rather than guessed
  Borges: null,
  "La Ramada": null,
  "Chiqui Chiqui": null,
  "Pigeon Point": [37.1817, -122.3939], // the lighthouse
  "El Florido": "El Florido, Camotán, Chiquimula, Guatemala",
  Uruguayana: "Uruguaiana, Rio Grande do Sul, Brasil",
  "Big Sure": "Big Sur, California",
  "Pacific Valley": "Pacific Valley, Monterey County, California",
  "El Captain Beach State Park": "El Capitán State Beach, California",
  Carpintera: "Carpinteria, California",
  "Point Mug": "Point Mugu, California",
  "Venice Beach (Los Angeles)": "Venice, Los Angeles",
  "Capistrano Beach": "Capistrano Beach, Dana Point",
  Chiquimullilla: "Chiquimulilla, Santa Rosa, Guatemala",
  Ciulapa: "Cuilapa, Santa Rosa, Guatemala",
  Esperanza: "La Esperanza, Intibucá, Honduras",
  "Los Manos": "Las Manos, Honduras",
  Ometepe: "Moyogalpa, Ometepe",
  "Penas Blancas": "Peñas Blancas, Rivas, Nicaragua",
  Manzanilla: "Manzanillo, Guanacaste, Costa Rica",
  Corazallito: "Corozalito, Guanacaste, Costa Rica",
  "Paso Canoas": "Paso Canoas, Costa Rica",
  Gorgona: "Gorgona, Chame, Panamá",
  Lasso: "Lasso, Cotopaxi, Ecuador",
  Ona: "Oña, Azuay, Ecuador",
  Sorozonga: "Sozoranga, Loja, Ecuador",
  Macara: "Macará, Loja, Ecuador",
  "Tambo Grande": "Tambogrande, Piura, Peru",
  Huacachino: "Huacachina, Ica, Peru",
  "Pampa Marca": "Pampamarca, Ayacucho, Peru",
  Chalhancua: "Chalhuanca, Apurímac, Peru",
  "Agua Calientes": "Aguas Calientes, Cusco, Peru",
  Pisaq: "Pisac, Cusco, Peru",
  Siguani: "Sicuani, Cusco, Peru",
  Kasani: "Kasani, Puno, Peru",
  "Puerto Suarez": "Puerto Suárez, Santa Cruz, Bolivia",
  Corumba: "Corumbá, Mato Grosso do Sul, Brasil",
  "Campo 9": "Doctor Juan Eulogio Estigarribia, Caaguazú, Paraguay",
  Capiovi: "Capioví, Misiones, Argentina",
  "San Jose|513argentinien.html": "San José, Apóstoles, Misiones, Argentina",
  "La Cruz|513argentinien.html": "La Cruz, Corrientes, Argentina",
  "Barro do Quarai": "Barra do Quaraí, Rio Grande do Sul, Brasil",
  "Bella Union": "Bella Unión, Artigas, Uruguay",
  "Termes Arapay": "Termas del Arapey, Salto, Uruguay",
  Guaviyu: "Termas de Guaviyú, Paysandú, Uruguay",
  Andresito: "Andresito, Flores, Uruguay",
  "San Jose|514uruguay.html": "San José de Mayo, Uruguay",
};

/** The stops in order, read as lib/route.ts reads them. */
function stops(html) {
  const text = parse(html).text.replace(/\s+/g, " ");
  const label = /(?:Gefahrene Route|Route cycled)\s*(?:\([^)]*\))?\s*:/i.exec(text);
  if (!label) return [];
  const out = [];
  let rest = text.slice(label.index + label[0].length);
  for (let m = /^\s*([^/]*?)\/\s*[\d'’.,]+\s*km/.exec(rest); m; m = /^\s*([^/]*?)\/\s*[\d'’.,]+\s*km/.exec(rest)) {
    // "El Florido– Copan Ruinas": a dash with no space before it too
    for (const part of m[1].split(/\s*[-–]\s+/)) {
      const place = part.split(/\s*->\s*/)[0].trim();
      if (place && out[out.length - 1] !== place) out.push(place);
    }
    rest = rest.slice(m[0].length);
  }
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  for (let tries = 0; ; tries++) {
    const res = await fetch(url, { headers: { "User-Agent": AGENT } });
    if (res.ok) return res.json();
    if (tries === 2 || res.status < 500) throw new Error(`${res.status} ${url}`);
    await sleep(3000);
  }
}

/** [lat, lon] of a stop, from the cache or Nominatim (one request a second, as it asks). */
async function locate(place, page, box, cache) {
  const key = `${page}|${place}`;
  if (cache[key]) return cache[key];
  const q = [QUERIES[key], QUERIES[place], place].find((v) => v !== undefined);
  if (q === null) return undefined;
  if (Array.isArray(q)) return (cache[key] = q);
  await sleep(1100);
  // a bare name is a town ("Monterey" would be the county, its centre in the hills)
  const town = q === place ? "&featureType=settlement" : "";
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}&viewbox=${box.join(",")}&bounded=1${town}`;
  const [hit] = await get(url);
  if (!hit) return undefined;
  return (cache[key] = [round(Number(hit.lat)), round(Number(hit.lon))]);
}

/**
 * The road between two places as [lat, lon]s, or undefined when there is none
 * worth drawing. The bicycle router first; it keeps off highways like the
 * Panamericana, which they rode anyway, so then the car router.
 */
async function road(a, b) {
  for (const profile of ["routed-bike", "routed-car"]) {
    await sleep(500);
    const url = `https://routing.openstreetmap.de/${profile}/route/v1/driving/${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson`;
    const data = await get(url).catch(() => undefined);
    const route = data?.routes?.[0];
    // a ride doesn't go three times the distance as the crow flies: that's a
    // missing road (the Machu Picchu railway) or a ferry the router went around
    if (route && route.distance / 1000 <= 3 * km(a, b) + 5) return route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
  }
  return undefined;
}

const cache = existsSync(PLACES) ? JSON.parse(readFileSync(PLACES, "utf8")) : {};
const result = {};
let points = 0;
for (const [page, box] of Object.entries(PAGES)) {
  const names = stops(readFileSync(join(DIR, page), "utf8"));
  const found = [];
  for (const name of names) {
    const at = await locate(name, page, box, cache);
    if (at) found.push({ name, at });
    else console.warn(`  ${page}: not found: ${name}`);
  }
  writeFileSync(PLACES, JSON.stringify(cache, null, 1));

  const lines = [];
  const info = [];
  for (let i = 1; i < found.length; i++) {
    const [a, b] = [found[i - 1], found[i]];
    // no day's ride (or bus) is that long: one of the two is the wrong place
    if (km(a.at, b.at) > 500) console.warn(`  ${page}: suspicious hop: ${a.name} – ${b.name}`);
    const path = await road(a.at, b.at);
    const line = simplify(path ?? [a.at, b.at]).map(([lat, lon]) => [round(lat), round(lon)]);
    lines.push(line);
    info.push({
      km: Math.round(line.slice(1).reduce((s, p, j) => s + km(line[j], p), 0)),
      from: a.name,
      to: b.name,
      ...(!path && { straight: true }),
    });
    if (!path) console.warn(`  ${page}: drawn straight: ${a.name} – ${b.name}`);
  }
  points += lines.reduce((n, l) => n + l.length, 0);
  const total = info.reduce((s, d) => s + d.km, 0);
  result[`5route/${page}`] = [{ label: "", km: total, lines, info, planned: true }];
  console.log(page.padEnd(24), `${found.length}/${names.length} stops, ${total} km`);
}
writeFileSync(OUT, JSON.stringify(result));
console.log(`\n${Object.keys(result).length} pages, ${points} points, ${(JSON.stringify(result).length / 1e3).toFixed(0)} kB`);
