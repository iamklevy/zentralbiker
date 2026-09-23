import type { Metadata } from "next";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageHero } from "@/components/site/page-hero";
import { Section } from "@/components/site/section";
import { Prose } from "@/components/site/prose";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { getPage } from "@/lib/content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "newsletter" });
  return { title: t("title"), description: t("lead") };
}

export default async function NewsletterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ confirmed?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  // The confirm API route redirects back here with a result flag.
  const { confirmed } = await searchParams;
  const archive = getPage("/varia/newsletter-archiv");

  return (
    <>
      <PageHero
        crumbs={[{ label: t("section.varia.title"), href: "/varia" }, { label: t("newsletter.title") }]}
        title={t("newsletter.title")}
        lead={t("newsletter.lead")}
      />

      <Section>
        <div className="max-w-[46rem]">
          {confirmed === "1" && (
            <Banner ok>{t("newsletter.confirmed")}</Banner>
          )}
          {confirmed === "0" && <Banner>{t("newsletter.confirm_failed")}</Banner>}

          <NewsletterForm />
        </div>
      </Section>

      {archive?.html && (
        <Section tint>
          <h2 className="mb-6 text-[clamp(1.3rem,1.1rem+1vw,1.8rem)]">{t("newsletter.archive")}</h2>
          <Prose html={archive.html} />
        </Section>
      )}
    </>
  );
}

function Banner({ ok, children }: { ok?: boolean; children: React.ReactNode }) {
  const Icon = ok ? CheckCircle2 : AlertCircle;
  return (
    <p
      role="status"
      className={`mb-5 flex items-center gap-2 rounded-card border p-4 text-[0.95rem] ${
        ok ? "border-pine/30 bg-pine-soft text-pine" : "border-danger/30 bg-danger-soft text-danger"
      }`}
    >
      <Icon className="size-4 shrink-0" />
      {children}
    </p>
  );
}
