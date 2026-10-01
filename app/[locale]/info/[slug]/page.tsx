import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { ContentPage, sectionSlugs, titleFromSlug } from "@/components/site/content-page";
import { translatedTitle } from "@/lib/content";
import { pageAlternates } from "@/lib/seo";

export function generateStaticParams() {
  const slugs = sectionSlugs("info");
  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  return { title: translatedTitle(`/info/${slug}`, locale) ?? titleFromSlug(slug), alternates: pageAlternates(`/info/${slug}`, locale) };
}

export default async function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  return <ContentPage path={`/info/${slug}`} locale={locale} />;
}
