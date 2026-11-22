import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import de from "../messages/de.json";
import en from "../messages/en.json";

/*
 * Static imports on purpose. A template-string import
 * (`../messages/${locale}.json`) is not watched by the dev server, so edits to
 * the language files were silently ignored until the cache was cleared —
 * which showed up as MISSING_MESSAGE errors for keys that did exist.
 */
const MESSAGES = { de, en } as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: MESSAGES[locale],
  };
});
