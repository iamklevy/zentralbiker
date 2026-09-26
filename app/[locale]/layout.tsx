import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { SiteChrome } from "@/components/site/site-chrome";
import "../globals.css";

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
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.zentralbiker.ch";

  return {
    title: { default: t("title"), template: `%s — Zentralbiker` },
    description: t("description"),
    metadataBase: new URL(base),
    alternates: {
      // German is un-prefixed (localePrefix: "as-needed"), so its canonical
      // is the bare path — matching what the old site's URLs already were.
      canonical: locale === routing.defaultLocale ? "/" : `/${locale}`,
      languages: { de: "/", en: "/en" },
    },
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
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          <SiteChrome>{children}</SiteChrome>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
