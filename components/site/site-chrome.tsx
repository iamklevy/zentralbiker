"use client";

import { useLocale, useMessages, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { MAIN_NAV, SECTION_BANNERS, HOME_SIDEBAR, sectionOf } from "@/content/nav";
import chromeJson from "@/content/generated/chrome.json";
import { cn } from "@/lib/utils";
import { mediaUrl } from "@/lib/media";

type Chrome = { banner: string | null; sidebar: { label: string; href: string }[] };
const CHROME = chromeJson as Record<string, Chrome>;

/**
 * The page frame, full width: the section's Lucerne banner as an edge-to-edge
 * panorama with "Zentralschweizer auf Weltreise" set over it, a sticky menu
 * bar, then the sidebar menu beside the content, and the footer. Visual rules
 * live in the `.zb-*` block of app/globals.css.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const messages = useMessages() as { sidebar?: Record<string, string> };

  const section = sectionOf(pathname);
  const sectionLabel = t(`nav.${MAIN_NAV.find((n) => n.href === section)?.labelKey ?? "home"}`);
  const chrome = CHROME[pathname];
  const banner = chrome?.banner ?? SECTION_BANNERS[section];

  // Sidebar labels were copied verbatim from the German pages; English gets
  // them from the `sidebar` dictionary and falls back to the original.
  const sidebar =
    chrome?.sidebar.length
      ? chrome.sidebar.map((l) => ({ ...l, label: messages.sidebar?.[l.label] ?? l.label }))
      : section === "/"
        ? HOME_SIDEBAR.map((l) => ({ href: l.href, label: t(`nav.${l.labelKey}`) }))
        : (CHROME[section]?.sidebar ?? []).map((l) => ({ ...l, label: messages.sidebar?.[l.label] ?? l.label }));

  const current = sidebar.find((item) => item.href === pathname);
  const other = locale === "de" ? "en" : "de";

  const sidebarLinks = (
    <ul>
      {sidebar.map((item) => (
        <li key={item.href + item.label}>
          <Link href={item.href} className={cn(item.href === pathname && "is-active")}>
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="zb-page">
      <header className="zb-hero">
        {/* Keyed on the file so a new section's picture fades in. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={banner}
          className="zb-hero-img"
          src={mediaUrl(`images/kopf/${banner}`)}
          alt="Luzern"
          width={1000}
          height={140}
          fetchPriority="high"
        />
        <div className="zb-wrap zb-hero-text">
          <p>{t("brand.tag")}</p>
        </div>
      </header>

      <nav className="zb-nav" aria-label={t("nav.main")}>
        <div className="zb-wrap">
          <Link href="/" className="zb-brand">
            Zentralbiker
          </Link>
          <ul>
            {MAIN_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={cn(section === item.href && "is-active")}>
                  {t(`nav.${item.labelKey}`)}
                </Link>
              </li>
            ))}
          </ul>
          {/* Keeps the reader on the same page in the other language. */}
          <Link href={pathname} locale={other} className="zb-lang" hrefLang={other}>
            {other.toUpperCase()}
          </Link>
        </div>
      </nav>

      <div className="zb-wrap zb-body">
        {sidebar.length > 0 && (
          <nav className="zb-sidebar" aria-label={t("nav.sub")}>
            <p className="zb-sidebar-title">{sectionLabel}</p>
            {sidebarLinks}
          </nav>
        )}

        <div className="zb-main">
          {/* Phones only: the sidebar folded into one line, so the page starts
              with its content rather than a screenful of links. Keyed on the
              path so it closes again after a tap navigates. */}
          {sidebar.length > 0 && (
            <details className="zb-submenu" key={pathname}>
              <summary>
                {sectionLabel}
                {current && <>: <span>{current.label}</span></>}
              </summary>
              {sidebarLinks}
            </details>
          )}

          <main className="zb-content">{children}</main>
        </div>
      </div>

      <footer className="zb-footer">
        <div className="zb-wrap">
          <p>
            <Link href="/varia/impressum">{t("footer.impressum")}</Link>
            <span aria-hidden>|</span>
            <Link href="/varia/kontakt">{t("footer.kontakt")}</Link>
            <span aria-hidden>|</span>
            &copy; Zentralbiker
          </p>
        </div>
      </footer>
    </div>
  );
}
