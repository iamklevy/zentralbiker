import { setRequestLocale } from "next-intl/server";

import { ContentPage } from "@/components/site/content-page";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ContentPage path="/" locale={locale} />;
}
