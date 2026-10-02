import type { Metadata } from "next";
import { Caveat } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { SiteChrome } from "@/components/site/site-chrome";
import { SITE_URL } from "@/lib/seo";
import "../globals.css";

// The handwriting on the photo overview prints (see .zb-print--labelled).
const caveat = Caveat({ subsets: ["latin"], variable: "--font-hand", display: "swap" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    title: { default: t("title"), template: `%s — Zentralbiker` },
    description: t("description"),
    metadataBase: new URL(SITE_URL),
    // No canonical/hreflang here: they must name the page itself, so each
    // page sets its own with pageAlternates (lib/seo.ts).
    openGraph: {
      title: t("title"),
      description: t("description"),
      locale: locale === "de" ? "de_CH" : "en_GB",
      type: "website",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // opts this tree into static rendering
  setRequestLocale(locale);

  return (
    <html lang={locale} className={caveat.variable}>
      <body>
        <NextIntlClientProvider>
          <SiteChrome>{children}</SiteChrome>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
