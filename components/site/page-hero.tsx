import { ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Wrap } from "./section";

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Page header with breadcrumbs.
 *
 * The original site carried a fixed 1000x140 photo band above every page
 * (a different Lucerne shot per section). That idea is kept as an optional
 * `image`, but it now sits behind the title as a responsive cover rather
 * than a hard-coded pixel-sized <img>.
 */
export async function PageHero({
  crumbs = [],
  title,
  lead,
  image,
  meta,
}: {
  crumbs?: Crumb[];
  title: string;
  lead?: string;
  image?: string | null;
  meta?: React.ReactNode;
}) {
  const t = await getTranslations();

  return (
    <section className="relative border-b border-line bg-paper-2">
      {image && (
        <div className="absolute inset-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/60 to-ink/35" />
        </div>
      )}
      <Wrap className={image ? "relative py-14 text-paper md:py-20" : "py-10 md:py-14"}>
        <nav
          className={`mb-3 flex flex-wrap items-center gap-2 text-[0.85rem] ${
            image ? "text-paper/75" : "text-muted"
          }`}
        >
          <Link href="/" className="hover:underline">
            {t("crumb.home")}
          </Link>
          {crumbs.map((c) => (
            <span key={c.label} className="flex items-center gap-2">
              <ChevronRight className="size-3.5 opacity-50" />
              {c.href ? (
                <Link href={c.href} className="hover:underline">
                  {c.label}
                </Link>
              ) : (
                <span>{c.label}</span>
              )}
            </span>
          ))}
        </nav>

        <h1 className="text-[clamp(1.9rem,1.3rem+3vw,3.4rem)]">{title}</h1>

        {lead && (
          <p
            className={`mt-3 max-w-[62ch] text-[clamp(1rem,0.95rem+0.3vw,1.15rem)] ${
              image ? "text-paper/80" : "text-muted"
            }`}
          >
            {lead}
          </p>
        )}

        {meta && <div className="mt-5">{meta}</div>}
      </Wrap>
    </section>
  );
}
