import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { HomeJournal } from "@/components/site/home-journal";
import { pageAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: pageAlternates("/", locale) };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HomeJournal locale={locale} />;
}
