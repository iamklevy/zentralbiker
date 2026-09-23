import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageHero } from "@/components/site/page-hero";
import { Section } from "@/components/site/section";
import { Prose } from "@/components/site/prose";
import { ContactForm } from "@/components/site/contact-form";
import { getPage } from "@/lib/content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return { title: t("title"), description: t("lead") };
}

export default async function KontaktPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  // Whatever standing text the old contact page carried (addresses, notes)
  // still shows above the rebuilt form.
  const page = getPage("/varia/kontakt");

  return (
    <>
      <PageHero
        crumbs={[{ label: t("section.varia.title"), href: "/varia" }, { label: t("contact.title") }]}
        title={t("contact.title")}
        lead={t("contact.lead")}
      />

      <Section>
        <div className="max-w-[46rem]">
          {page?.html && page.words > 5 && <Prose html={page.html} className="mb-8" />}
          <ContactForm />
        </div>
      </Section>
    </>
  );
}
