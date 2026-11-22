import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { sectionSlugs, titleFromSlug } from "@/components/site/content-page";
import { GearSheet } from "@/components/site/gear";
import { translatedTitle } from "@/lib/content";
import { pageAlternates } from "@/lib/seo";

export function generateStaticParams() {
  const slugs = sectionSlugs("ausruestung");
  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  return { title: translatedTitle(`/ausruestung/${slug}`, locale) ?? titleFromSlug(slug), alternates: pageAlternates(`/ausruestung/${slug}`, locale) };
}

export default async function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  return <GearSheet slug={slug} locale={locale} />;
}
