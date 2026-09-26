import { defineRouting } from "next-intl/routing";

/**
 * German is the default and stays un-prefixed at `/`, because that is what the
 * old static site served and what its inbound links and search rankings point
 * at. English gets its own indexable tree at `/en/...`
 * — the original had no translations at all, so this is additive.
 */
export const routing = defineRouting({
  locales: ["de", "en"],
  defaultLocale: "de",
  localePrefix: "as-needed",
  /*
   * Content negotiation is off deliberately.
   *
   * With it on, "/" serves whatever the visitor's Accept-Language header asks
   * for — so the same URL that Google has indexed as German would answer in
   * English to an English browser. The old site served German at "/" for
   * years and its inbound links and rankings all point there, so that URL has
   * to stay German for everyone. English is reachable, and
   * discoverable, through the explicit /en prefix and the hreflang
   * alternates in the layout's metadata.
   */
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
