import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { ContentPage, sectionSlugs, titleFromSlug } from "@/components/site/content-page";

/** Gästebuch, Newsletter and Kontakt have their own routes with real forms. */
const REBUILT = new Set(["gaestebuch", "newsletter", "kontakt", "gb"]);

export function generateStaticParams() {
  const slugs = sectionSlugs("varia").filter((s) => !REBUILT.has(s));
  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: titleFromSlug(slug) };
}

export default async function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  return <ContentPage path={`/varia/${slug}`} locale={locale} />;
}
