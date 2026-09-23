import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { ContentPage, sectionSlugs, titleFromSlug } from "@/components/site/content-page";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    sectionSlugs("ausruestung").map((slug) => ({ locale, slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: titleFromSlug(slug) };
}

export default async function AusruestungPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <ContentPage
      path={`/ausruestung/${slug}`}
      title={titleFromSlug(slug)}
      crumbs={[
        { label: t("section.ausruestung.title"), href: "/ausruestung" },
        { label: titleFromSlug(slug) },
      ]}
    />
  );
}
