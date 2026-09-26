import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { GuestbookForm } from "@/components/site/guestbook-form";
import { listEntries } from "@/lib/guestbook/actions";
import { formatDate } from "@/lib/utils";

// Entries are moderated, so a short revalidate window is plenty — and it
// keeps the page static for the overwhelming majority of visits.
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "guestbook" });
  return { title: t("title"), description: t("lead") };
}

export default async function GaestebuchPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const entries = await listEntries();

  return (
    <>
      <h1>{t("guestbook.title")}</h1>

      <section>
        <div className="grid gap-10 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <div className="">
            <GuestbookForm />
          </div>

          <div>
            <p className="mb-5 text-[0.9rem] text-muted">
              {t("guestbook.entries", { count: entries.length })}
            </p>

            {entries.length === 0 ? (
              <p className="text-muted">{t("guestbook.empty")}</p>
            ) : (
              <ul className="space-y-4">
                {entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="border-b border-[#666] py-3"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-[1.05rem] font-semibold text-ink">
                        {entry.name}
                        {entry.location && (
                          <span className="ms-2 text-[0.88rem] font-normal text-muted">
                            {entry.location}
                          </span>
                        )}
                      </p>
                      <time dateTime={entry.created_at} className="text-[0.82rem] text-faint">
                        {formatDate(entry.created_at, locale)}
                      </time>
                    </div>
                    {/*
                      Visitor-submitted text: rendered as a React text node so
                      it is escaped, and `whitespace-pre-line` keeps the
                      author's line breaks without any markup being parsed.
                    */}
                    <p className="mt-2 whitespace-pre-line text-[0.98rem] leading-relaxed text-ink-2">
                      {entry.message}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
