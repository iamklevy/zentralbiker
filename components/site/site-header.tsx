"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Menu, Globe, ChevronDown, Check } from "lucide-react";

import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { MAIN_NAV, LOCALE_NAMES } from "@/content/nav";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  /** "/" only matches exactly; every other section matches its whole subtree. */
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-50 border-b border-ink-2/60 bg-ink/95 backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex w-[min(1180px,100%-2.5rem)] items-center gap-4 py-3">
        <Link href="/" className="me-auto flex items-baseline gap-2">
          <span className="font-display text-[1.25rem] font-semibold tracking-tight text-paper">
            {t("brand.name")}
          </span>
          <span className="hidden text-[0.78rem] text-paper/55 sm:block">{t("brand.tag")}</span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex">
          {MAIN_NAV.map((item) => (
            <div key={item.href} className="group relative">
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-1 rounded-full px-3.5 py-2 text-[0.94rem] font-medium text-paper/75 transition-colors hover:bg-paper/10 hover:text-paper",
                  isActive(item.href) && "bg-accent/15 text-accent",
                )}
              >
                {t(`nav.${item.labelKey}`)}
                {item.children && <ChevronDown className="size-3.5 opacity-50" />}
              </Link>

              {item.children && (
                /* CSS-only dropdown: no state, and it still opens on keyboard
                   focus thanks to focus-within. */
                <div className="invisible absolute start-0 top-full z-10 min-w-48 translate-y-1 rounded-xl border border-line bg-paper p-1.5 opacity-0 shadow-lift transition-[opacity,transform] group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={cn(
                        "block rounded-lg px-3 py-2 text-[0.92rem] text-ink-2 hover:bg-paper-2",
                        isActive(child.href) && "text-accent-2",
                      )}
                    >
                      {t(`nav.${child.labelKey}`)}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Language switcher — keeps the reader on the same page. */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-paper/25 bg-transparent text-paper hover:bg-paper/10 hover:text-paper"
            onClick={() => setLangOpen((v) => !v)}
            onBlur={() => setTimeout(() => setLangOpen(false), 120)}
            aria-label={t("nav.language")}
            aria-expanded={langOpen}
          >
            <Globe className="size-4 opacity-60" />
            <span className="uppercase">{locale}</span>
          </Button>
          {langOpen && (
            <div className="absolute end-0 top-full z-20 mt-1 min-w-40 rounded-xl border border-line bg-paper p-1.5 shadow-lift">
              {routing.locales.map((l) => (
                <Link
                  key={l}
                  href={pathname}
                  locale={l}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-[0.92rem] text-ink-2 hover:bg-paper-2"
                  onClick={() => setLangOpen(false)}
                >
                  {LOCALE_NAMES[l] ?? l}
                  {l === locale && <Check className="size-3.5 text-accent-2" />}
                </Link>
              ))}
            </div>
          )}
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full border-paper/25 bg-transparent text-paper hover:bg-paper/10 hover:text-paper lg:hidden"
              aria-label={t("nav.menu")}
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[min(22rem,88vw)] overflow-y-auto p-0">
            <SheetTitle className="border-b border-line px-5 py-4 font-display text-[1.1rem]">
              {t("brand.name")}
            </SheetTitle>
            <nav className="flex flex-col p-3">
              {MAIN_NAV.map((item) => (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "block rounded-lg px-3 py-2.5 text-[1rem] font-medium text-ink-2 hover:bg-paper-2",
                      isActive(item.href) && "bg-accent-soft text-accent-2",
                    )}
                  >
                    {t(`nav.${item.labelKey}`)}
                  </Link>
                  {item.children?.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-lg px-3 py-2 ps-7 text-[0.92rem] text-muted hover:bg-paper-2"
                    >
                      {t(`nav.${child.labelKey}`)}
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
