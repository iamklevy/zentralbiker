import paths from "@/content/generated/paths.json";

/**
 * English URLs. Routes, data and the links inside the migrated pages all use
 * the original German paths; these are only the public spelling under /en,
 * e.g. /ueber-uns -> /en/about-us, /berichte/tuerkei -> /en/reports/turkey.
 *
 * Translated per path segment. A segment missing here stays as it is, which
 * is right for names that are the same in both languages (peru, laos, route).
 */
const EN: Record<string, string> = {
  // sections and the home pages
  "ueber-uns": "about-us",
  ausruestung: "equipment",
  berichte: "reports",
  fotos: "photos",

  // Ausrüstung
  administration: "paperwork",
  apotheke: "first-aid",
  diverses: "miscellaneous",
  ersatzteile: "spare-parts",
  kleider: "clothing",
  kochen: "cooking",
  necessaire: "toiletries",
  schlafen: "sleeping",
  technik: "electronics",
  trekkingrad: "touring-bike",
  werkzeug: "tools",

  // legs and regions
  amerika: "america",
  asien: "asia",
  ozeanien: "oceania",
  nordamerika: "north-america",
  suedamerika: "south-america",
  "highlights-amerika": "highlights-america",
  "highlights-asien": "highlights-asia",
  "highlights-ozeanien": "highlights-oceania",
  "filme-amerika": "films-america",
  "filme-asien": "films-asia",
  "filme-ozeanien": "films-oceania",

  // countries
  argentinien: "argentina",
  // Bolivia was crossed twice: "bolivien" on the America leg, "bolivia" at the
  // start of the Oceania leg. Neither can be plain "bolivia" in English: under
  // /en/route that is also the German path of the second visit, and next-intl
  // would redirect the first one there.
  bolivien: "bolivia-america",
  bolivia: "bolivia-oceania",
  kalifornien: "california",
  kambodscha: "cambodia",
  kirgistan: "kyrgyzstan",
  mexiko: "mexico",
  rumaenien: "romania",
  singapur: "singapore",
  tadschikistan: "tajikistan",
  tuerkei: "turkey",
  usbekistan: "uzbekistan",

  // Info
  fluege: "flights",
  impfung: "vaccinations",
  statistiken: "statistics",
  testberichte: "product-tests",
  visa: "visas",

  // Varia
  gaestebuch: "guestbook",
  impressum: "imprint",
  kontakt: "contact",
  medien: "media",
  "newsletter-archiv": "newsletter-archive",
};

const toEnglish = (path: string) =>
  path
    .split("/")
    .map((seg) => EN[seg] ?? seg)
    .join("/");

export const pathnames: Record<string, { de: string; en: string }> = Object.fromEntries(
  (paths as string[]).map((path) => [path, { de: path, en: toEnglish(path) }]),
);

// An English URL must be unique, and must not be another page's German path:
// next-intl reads /en/<german path> as that page and redirects to its English
// URL, so the page that wanted it could never be reached.
const seen = new Map<string, string>();
for (const [de, { en }] of Object.entries(pathnames)) {
  const clash = seen.get(en) ?? (en !== de && pathnames[en] ? en : undefined);
  if (clash) throw new Error(`English URL ${en} of ${de} is already taken by ${clash}`);
  seen.set(en, de);
}
