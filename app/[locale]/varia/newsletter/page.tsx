import type { Metadata } from "next";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

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
      <h1>{t("newsletter.title")}</h1>

      <section>
        <div>
          {confirmed === "1" && (
            <Banner ok>{t("newsletter.confirmed")}</Banner>
          )}
          {confirmed === "0" && <Banner>{t("newsletter.confirm_failed")}</Banner>}

          <NewsletterForm />
        </div>
      </section>

      {archive?.html && (
        <section className="mt-8">
          <h2 className="mb-6 text-[14px] font-bold">{t("newsletter.archive")}</h2>
          <Prose html={archive.html} />
        </section>
      )}
    </>
  );
}

function Banner({ ok, children }: { ok?: boolean; children: React.ReactNode }) {
  const Icon = ok ? CheckCircle2 : AlertCircle;
  return (
    <p
      role="status"
      className={`mb-5 flex items-center gap-2 border p-4 text-[0.95rem] ${
        ok ? "border-pine/30 bg-pine-soft text-pine" : "border-danger/30 bg-danger-soft text-danger"
      }`}
    >
      <Icon className="size-4 shrink-0" />
      {children}
    </p>
  );
}
