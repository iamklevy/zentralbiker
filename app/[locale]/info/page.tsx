import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ContentPage } from "@/components/site/content-page";
import { pageAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return { title: t("nav.info"), alternates: pageAlternates("/info", locale) };
}

/**
 * When the site was last updated: the time this version was built (see
 * next.config.ts), in Lucerne's time zone — "Mittwoch, 7. Oktober 2026, 14:05".
 */
function lastUpdated(locale: string) {
  const built = process.env.BUILD_TIME ? new Date(process.env.BUILD_TIME) : new Date();
  return built.toLocaleString(locale === "de" ? "de-CH" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Zurich",
  });
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  // the old page's "Letzte Aktualisierung:<br> Mittwoch, 20. Mai, 2020 13:32"
  // (English: "Last updated:<br> …") gets the real date
  const transform = (html: string) =>
    html.replace(/((?:Aktualisierung|Last updated):\s*<br>)[\s\S]*?(<\/span>)/, `$1\n${lastUpdated(locale)}$2`);
  return <ContentPage path="/info" locale={locale} transform={transform} />;
}
