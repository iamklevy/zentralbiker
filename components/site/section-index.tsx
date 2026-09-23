import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Stagger, StaggerItem } from "@/components/site/motion";
import { pagesInSection, type MigratedPage } from "@/lib/content";

/**
 * Card list for the simple sections — Ausrüstung, Info, Varia.
 *
 * These were flat folders of one-off pages on the old site with no data model
 * behind them, so the index is derived straight from what the migration
 * produced rather than from a hand-maintained list. Adding a page to the
 * mirror and re-running `npm run migrate` is enough to make it appear.
 */
export async function SectionIndex({
  section,
  titles = {},
  extra = [],
}: {
  section: string;
  /** Override a derived title, keyed by new path. */
  titles?: Record<string, string>;
  /** Hand-written entries (the rebuilt interactive pages) shown first. */
  extra?: { href: string; title: string; note?: string }[];
}) {
  const t = await getTranslations();
  const pages = pagesInSection(section).filter((p) => !extra.some((e) => e.href === p.path));

  return (
    <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {extra.map((item) => (
        <StaggerItem key={item.href}>
          <Card href={item.href} title={item.title} note={item.note} accent />
        </StaggerItem>
      ))}

      {pages.map((page) => (
        <StaggerItem key={page.path}>
          <Card
            href={page.path}
            title={titles[page.path] ?? deriveTitle(page)}
            note={page.words > 40 ? t("common.words", { count: page.words }) : undefined}
          />
        </StaggerItem>
      ))}
    </Stagger>
  );
}

/**
 * The old <title> was the same site-wide string on nearly every page, so it
 * is useless as a label. The filename is the only per-page name there is.
 */
function deriveTitle(page: MigratedPage): string {
  const slug = page.path.split("/").pop() ?? "";
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bUeber\b/, "Über")
    .replace(/\bAusruestung\b/, "Ausrüstung")
    .replace(/\bGaestebuch\b/, "Gästebuch")
    .replace(/\bFluege\b/, "Flüge");
}

function Card({
  href,
  title,
  note,
  accent,
}: {
  href: string;
  title: string;
  note?: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex h-full items-center justify-between gap-4 rounded-card border bg-paper p-5 shadow-soft transition-shadow hover:shadow-lift ${
        accent ? "border-accent/35" : "border-line"
      }`}
    >
      <span className="min-w-0">
        <span className="block font-display text-[1.1rem] font-semibold text-ink">{title}</span>
        {note && <span className="mt-0.5 block text-[0.85rem] text-muted">{note}</span>}
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-accent-2" />
    </Link>
  );
}
