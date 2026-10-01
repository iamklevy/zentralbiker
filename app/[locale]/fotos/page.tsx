import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PhotoOverview } from "@/components/site/photo-overview";
import { pageAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return { title: t("nav.fotos"), alternates: pageAlternates("/fotos", locale) };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PhotoOverview path="/fotos" locale={locale} />;
}
