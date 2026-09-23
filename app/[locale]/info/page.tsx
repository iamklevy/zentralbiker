import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageHero } from "@/components/site/page-hero";
import { Section } from "@/components/site/section";
import { SectionIndex } from "@/components/site/section-index";
import { SECTION_BANNERS } from "@/content/nav";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "section.info" });
  return { title: t("title"), description: t("lead") };
}

export default async function InfoIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <>
      <PageHero
        crumbs={[{ label: t("section.info.title") }]}
        title={t("section.info.title")}
        lead={t("section.info.lead")}
        image={SECTION_BANNERS["/info"]}
      />
      <Section>
        <SectionIndex section="info" />
      </Section>
    </>
  );
}
