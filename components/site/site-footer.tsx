import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { MAIN_NAV } from "@/content/nav";
import { Wrap } from "./section";

export async function SiteFooter() {
  const t = await getTranslations();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-line bg-ink text-paper">
      <Wrap className="py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="font-display text-[1.3rem] font-semibold">{t("brand.name")}</p>
            <p className="mt-2 max-w-[38ch] text-[0.94rem] text-paper/65">{t("footer.built")}</p>
          </div>

          <nav>
            <p className="mb-3 text-[0.78rem] font-bold uppercase tracking-[0.14em] text-accent">
              {t("footer.sections")}
            </p>
            <ul className="space-y-1.5 text-[0.94rem]">
              {MAIN_NAV.filter((i) => i.href !== "/").map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-paper/75 hover:text-paper">
                    {t(`nav.${item.labelKey}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav>
            <p className="mb-3 text-[0.78rem] font-bold uppercase tracking-[0.14em] text-accent">
              {t("footer.about")}
            </p>
            <ul className="space-y-1.5 text-[0.94rem]">
              <li>
                <Link href="/ueber-uns" className="text-paper/75 hover:text-paper">
                  {t("nav.ueber_uns")}
                </Link>
              </li>
              <li>
                <Link href="/varia/kontakt" className="text-paper/75 hover:text-paper">
                  {t("footer.kontakt")}
                </Link>
              </li>
              <li>
                <Link href="/varia/impressum" className="text-paper/75 hover:text-paper">
                  {t("footer.impressum")}
                </Link>
              </li>
              <li>
                <Link href="/varia/gaestebuch" className="text-paper/75 hover:text-paper">
                  {t("guestbook.title")}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <p className="mt-10 border-t border-paper/12 pt-6 text-[0.86rem] text-paper/55">
          {t("footer.rights", { year })}
        </p>
      </Wrap>
    </footer>
  );
}
