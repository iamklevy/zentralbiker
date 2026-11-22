import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Prose } from "@/components/site/prose";
import { ContactForm } from "@/components/site/contact-form";
import { getPage } from "@/lib/content";
import { pageAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return { title: t("title"), description: t("lead"), alternates: pageAlternates("/varia/kontakt", locale) };
}

export default async function KontaktPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  // Whatever standing text the old contact page carried (addresses, notes)
  // still shows above the rebuilt form.
  const page = getPage("/varia/kontakt", locale);

  return (
    <>
      <h1>{t("contact.title")}</h1>

      <section>
        <div>
          {page?.html && page.words > 5 && <Prose html={page.html} className="mb-8" />}
          <ContactForm />
        </div>
      </section>
    </>
  );
}
