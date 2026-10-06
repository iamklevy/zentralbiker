import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ReportsOverview } from "@/components/site/reports-overview";
import { pageAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return { title: t("nav.berichte"), alternates: pageAlternates("/berichte", locale) };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ReportsOverview locale={locale} />;
}
