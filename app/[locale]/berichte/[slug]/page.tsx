import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { ContentPage } from "@/components/site/content-page";
import { LEGS, getLeg, getCountry, localName } from "@/lib/content";
import { pageAlternates } from "@/lib/seo";

/**
 * One route serves two page kinds, because the old site's URLs did too:
 * /berichte/amerika is a leg index, /berichte/peru a country. Countries are looked
 * up by original file, since spellings differ between sections
 * (331bolivien.html vs 531bolivia.html).
 */
export function generateStaticParams() {
  const slugs = [
    ...LEGS.map((l) => l.slug),
    ...LEGS.flatMap((l) => l.countries.filter((c) => c.report).map((c) => c.slug)),
  ];
  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const name = getLeg(slug)?.name ?? getCountry(slug)?.name;
  return { ...(name && { title: localName(slug, name, locale) }), alternates: pageAlternates(`/berichte/${slug}`, locale) };
}

export default async function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  if (getLeg(slug)) return <ContentPage path={`/berichte/${slug}`} locale={locale} />;

  const country = getCountry(slug);
  if (!country?.report) notFound();
  return <ContentPage oldPath={country.report} locale={locale} />;
}
