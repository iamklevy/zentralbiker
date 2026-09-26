import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ContentPage } from "@/components/site/content-page";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return { title: t("nav.fotos") };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ContentPage path="/fotos" locale={locale} />;
}
