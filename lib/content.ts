import pagesJson from "@/content/generated/pages.json";
import journeyJson from "@/content/generated/journey.json";
import galleriesJson from "@/content/generated/galleries.json";
import enJson from "@/content/translations/en.json";

/* ------------------------------------------------------------------ types */

export interface MigratedPage {
  /** Path in the original static site, e.g. "3berichte/310peru.html". */
  oldPath: string;
  /** Path on the new site, e.g. "/berichte/peru". */
  path: string;
  title: string;
  /** Cleaned semantic HTML, already link- and image-rewritten. */
  html: string;
  text: string;
  words: number;
  images: string[];
}

export interface Country {
  num: number;
  slug: string;
  name: string;
  path: string;
  report?: string;
  route?: string;
  gallery?: string;
  galleryDir: string | null;
}

export interface Leg {
  slug: string;
  name: string;
  order: number;
  from: number;
  to: number;
  countries: Country[];
}

export interface GalleryItem {
  src: string;
  thumb: string;
}

export interface Gallery {
  dir: string;
  slug: string;
  name: string;
  count: number;
  items: GalleryItem[];
}

/* ------------------------------------------------------------------ data */

const PAGES = pagesJson as unknown as Record<string, MigratedPage>;
export const LEGS = (journeyJson as unknown as { legs: Leg[] }).legs;
const GALLERIES = galleriesJson as unknown as Record<string, Gallery>;

/** Every migrated page, keyed by its NEW path — the lookup the routes need. */
const BY_PATH = new Map<string, MigratedPage>();
for (const page of Object.values(PAGES)) {
  // The old tree has a few aliases pointing at the same new path; first wins,
  // and a page with actual prose always beats an empty stub.
  const existing = BY_PATH.get(page.path);
  if (!existing || page.words > existing.words) BY_PATH.set(page.path, page);
}

/* --------------------------------------------------------------- lookups */

/**
 * English versions of the migrated pages, keyed by new path. A page without
 * one is served in the original German — nothing is ever blank.
 */
const TRANSLATIONS: Record<string, Record<string, { title?: string; html: string }>> = {
  en: enJson as Record<string, { title?: string; html: string }>,
};

function localize(page: MigratedPage | null, locale?: string): MigratedPage | null {
  const tr = page && locale ? TRANSLATIONS[locale]?.[page.path] : undefined;
  return tr ? { ...page!, html: tr.html, title: tr.title ?? page!.title } : page;
}

export function getPage(path: string, locale?: string): MigratedPage | null {
  return localize(BY_PATH.get(path) ?? null, locale);
}

export function getPageByOldPath(oldPath: string, locale?: string): MigratedPage | null {
  return localize(PAGES[oldPath] ?? null, locale);
}

/** Whether a page has an English (or other) version yet. */
export function isTranslated(path: string, locale: string): boolean {
  return locale === "de" || Boolean(TRANSLATIONS[locale]?.[path]);
}

/** All migrated pages that live directly under a section, e.g. "/info". */
export function pagesInSection(section: string): MigratedPage[] {
  const prefix = `/${section}/`;
  return [...BY_PATH.values()]
    .filter((p) => p.path.startsWith(prefix))
    .sort((a, b) => a.oldPath.localeCompare(b.oldPath, "de", { numeric: true }));
}

export const ALL_COUNTRIES: Country[] = LEGS.flatMap((l) => l.countries);

export function getLeg(slug: string): Leg | null {
  return LEGS.find((l) => l.slug === slug) ?? null;
}

export function getCountry(slug: string): Country | null {
  return ALL_COUNTRIES.find((c) => c.slug === slug) ?? null;
}

/** The leg a country belongs to, for breadcrumbs and prev/next. */
export function legOf(slug: string): Leg | null {
  return LEGS.find((l) => l.countries.some((c) => c.slug === slug)) ?? null;
}

/** Previous/next country within the whole journey, for report pagination. */
export function neighbours(slug: string): { prev: Country | null; next: Country | null } {
  const i = ALL_COUNTRIES.findIndex((c) => c.slug === slug);
  if (i < 0) return { prev: null, next: null };
  return {
    prev: i > 0 ? ALL_COUNTRIES[i - 1] : null,
    next: i < ALL_COUNTRIES.length - 1 ? ALL_COUNTRIES[i + 1] : null,
  };
}

/* ------------------------------------------------------------- galleries */

export const ALL_GALLERIES: Gallery[] = Object.values(GALLERIES).sort((a, b) =>
  a.dir.localeCompare(b.dir, "de", { numeric: true }),
);

export function getGallery(slug: string): Gallery | null {
  return ALL_GALLERIES.find((g) => g.slug === slug) ?? null;
}

export function getGalleryByDir(dir: string | null): Gallery | null {
  return dir ? (GALLERIES[dir] ?? null) : null;
}

/** Highlight galleries are the curated per-continent sets; the rest are per country. */
/** Slugs of the migrated /fotos/* pages that are overviews, not galleries. */
export const FOTO_OVERVIEWS = pagesInSection("fotos")
  .map((p) => p.path.slice("/fotos/".length))
  .filter((slug) => !ALL_GALLERIES.some((g) => g.slug === slug));

export const HIGHLIGHT_GALLERIES = ALL_GALLERIES.filter((g) => g.slug.startsWith("highlights-"));
export const COUNTRY_GALLERIES = ALL_GALLERIES.filter((g) => !g.slug.startsWith("highlights-"));

/* ------------------------------------------------------------- site stats */

export const SITE_STATS = {
  countries: ALL_COUNTRIES.length,
  reports: ALL_COUNTRIES.filter((c) => c.report).length,
  photos: ALL_GALLERIES.reduce((n, g) => n + g.count, 0),
  legs: LEGS.length,
};

/** Asset path on the new site for a mirrored file. */
export { mediaUrl as media } from "@/lib/media";
