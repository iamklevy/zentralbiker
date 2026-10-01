import { ContentPage } from "@/components/site/content-page";
import { getPathname } from "@/i18n/navigation";
import { getPage } from "@/lib/content";
import { mediaUrl } from "@/lib/media";
import { parseOverview } from "@/lib/overview";
import { PRINT_TILTS } from "@/lib/print-path.mjs";

/**
 * A photo overview page (Fotos, Nordamerika, Filme Asien, …) as loose prints
 * with the place or film written on each — the same look as the galleries
 * they lead to. The old page is read into cards by lib/overview.ts; if that
 * finds nothing, the page is shown as it was.
 */
export function PhotoOverview({ path, locale }: { path: string; locale: string }) {
  const page = getPage(path, locale);
  const overview = page && parseOverview(page.html);
  if (!overview) return <ContentPage path={path} locale={locale} />;

  const href = (h: string) => (h.startsWith("/media/") ? mediaUrl(h.slice("/media/".length)) : getPathname({ href: h, locale }));
  let n = 0;

  return (
    <>
      {overview.nav.length > 0 && (
        <nav className="zb-overview-nav">
          {overview.nav.map((l) =>
            l.href === "#" || l.href === path ? (
              <span key={l.label} aria-current="page">
                {l.label}
              </span>
            ) : (
              <a key={l.label} href={href(l.href)}>
                {l.label}
              </a>
            ),
          )}
        </nav>
      )}

      {overview.sections.map((section, s) => (
        <section key={s}>
          {section.heading.length > 0 && <h2 className="zb-overview-heading">{section.heading.join(" · ")}</h2>}
          <ul className="zb-prints">
            {section.cards.map((card) => (
              <li key={card.img + card.href}>
                <a
                  href={href(card.href)}
                  className="zb-print zb-print--labelled"
                  style={{ "--tilt": `${PRINT_TILTS[n++ % PRINT_TILTS.length]}deg` } as React.CSSProperties}
                  {...(card.video && { target: "_blank", rel: "noopener" })}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaUrl(card.img)} alt="" width={card.width} height={card.height} loading="lazy" decoding="async" />
                  <span>{card.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
