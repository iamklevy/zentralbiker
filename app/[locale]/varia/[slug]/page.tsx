import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { ContentPage, sectionSlugs, titleFromSlug } from "@/components/site/content-page";

/**
 * Gästebuch, Newsletter and Kontakt have their own static routes with real
 * forms behind them, so they are excluded here. Next would prefer the static
 * segment anyway; leaving them out just avoids generating dead pages.
 */
const REBUILT = new Set(["gaestebuch", "newsletter", "kontakt", "gb"]);

export function generateStaticParams() {
  const slugs = sectionSlugs("varia").filter((s) => !REBUILT.has(s));
  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: titleFromSlug(slug) };
}

export default async function VariaPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <ContentPage
      path={`/varia/${slug}`}
      title={titleFromSlug(slug)}
      crumbs={[{ label: t("section.varia.title"), href: "/varia" }, { label: titleFromSlug(slug) }]}
    />
  );
}
