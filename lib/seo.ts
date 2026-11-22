import type { Metadata } from "next";

import { routing } from "@/i18n/routing";
import { getPathname } from "@/i18n/navigation";

/** Absolute base for canonical URLs and the sitemap. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.zentralbiker.ch").replace(/\/+$/, "");

/** A page's public URL in one language, e.g. ("/ueber-uns", "en") -> "/en/about-us". */
export const localizedPath = (path: string, locale: string) => getPathname({ href: path, locale });

/** Its URL in every language, plus x-default (German, the site's original). */
export function languageUrls(path: string): Record<string, string> {
  const urls: Record<string, string> = {};
  for (const l of routing.locales) urls[l] = localizedPath(path, l);
  urls["x-default"] = urls[routing.defaultLocale];
  return urls;
}

/**
 * Canonical URL and language alternates for one page, by its internal
 * (German) path. Every page sets its own: these must name the page itself,
 * so the layout cannot supply them — Next.js would give every page the same.
 * Relative URLs resolve against the layout's metadataBase.
 */
export function pageAlternates(path: string, locale: string): Metadata["alternates"] {
  return { canonical: localizedPath(path, locale), languages: languageUrls(path) };
}
