"use client";

import { useEffect, useRef, useState } from "react";
import NextLink from "next/link";
import { ArrowLeft, Menu, X } from "lucide-react";
import { useLocale, useMessages, useTranslations } from "next-intl";

import { Link, getPathname, usePathname } from "@/i18n/navigation";
import { MAIN_NAV, SECTION_BANNERS, HOME_SIDEBAR, parentOf, sectionOf } from "@/content/nav";
import chromeJson from "@/content/generated/chrome.json";
import { cn } from "@/lib/utils";
import { mediaUrl } from "@/lib/media";
import { ThemeToggle } from "@/components/site/theme-toggle";

type Chrome = { banner: string | null; sidebar: { label: string; href: string }[] };
const CHROME = chromeJson as Record<string, Chrome>;

/**
 * The page frame, full width: the section's Lucerne banner as an edge-to-edge
 * panorama, a sticky menu
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
  const parent = parentOf(pathname);
  const other = locale === "de" ? "en" : "de";

  // Phones: the main links sit behind a menu button. Remembering the path it
  // was opened on closes the panel by itself once a tap navigates away.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const menuOpen = openOn === pathname;
  const pillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setOpenOn(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onPointer = (e: PointerEvent) => {
      if (!pillRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [menuOpen]);

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
      </header>

      <nav className="zb-nav" aria-label={t("nav.main")}>
        <div className="zb-wrap">
          <div className="zb-nav-pill" ref={pillRef}>
            <Link href="/" className="zb-brand">
              Zentralbiker
            </Link>
            <button
              type="button"
              className="zb-menu-toggle"
              aria-expanded={menuOpen}
              aria-controls="zb-main-links"
              aria-label={t(menuOpen ? "nav.close" : "nav.menu")}
              onClick={() => setOpenOn(menuOpen ? null : pathname)}
            >
              {menuOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
              <span>{current?.label ?? sectionLabel}</span>
            </button>
            <ul>
              {MAIN_NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={cn(section === item.href && "is-active")}>
                    {t(`nav.${item.labelKey}`)}
                  </Link>
                </li>
              ))}
            </ul>
            <span className="zb-nav-divider" aria-hidden />
            {/* Keeps the reader on the same page in the other language. A plain
                link to the exact URL: next-intl's Link would send German to
                /de/... and leave the proxy to redirect it to the bare path. */}
            <NextLink href={getPathname({ href: pathname, locale: other })} className="zb-lang" hrefLang={other}>
              {other.toUpperCase()}
            </NextLink>
            <ThemeToggle />

            {/* Phones only: every section, then the pages of this one (the
                sidebar's links), in one panel under the pill. */}
            {menuOpen && (
              <div id="zb-main-links" className="zb-menu-panel">
                <ul className="zb-menu-sections">
                  {MAIN_NAV.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className={cn(section === item.href && "is-active")}>
                        {t(`nav.${item.labelKey}`)}
                      </Link>
                    </li>
                  ))}
                </ul>
                {/* No heading: the highlighted section above already names them. */}
                {sidebar.length > 0 && <div className="zb-menu-pages">{sidebarLinks}</div>}
              </div>
            )}
          </div>
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
          {/* A plain, labelled way up one level, for readers who don't
              think of the browser's back button or the menus. */}
          {parent && (
            <Link href={parent.href} className="zb-back">
              <ArrowLeft className="size-4" aria-hidden />
              {t("nav.back", { page: t(`nav.${parent.labelKey}`) })}
            </Link>
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
