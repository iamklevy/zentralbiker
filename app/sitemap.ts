import type { MetadataRoute } from "next";

import { routing } from "@/i18n/routing";
import { pathnames } from "@/i18n/pathnames";
import { SITE_URL, languageUrls, localizedPath } from "@/lib/seo";

/**
 * /sitemap.xml — every page in every language, each entry naming its
 * translations so search engines pair /ueber-uns with /en/about-us.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const abs = (p: string) => SITE_URL + p;
  return Object.keys(pathnames).flatMap((path) => {
    const languages = Object.fromEntries(Object.entries(languageUrls(path)).map(([l, p]) => [l, abs(p)]));
    return routing.locales.map((locale) => ({
      url: abs(localizedPath(path, locale)),
      alternates: { languages },
    }));
  });
}
