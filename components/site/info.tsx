import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  ChartColumn,
  Clock,
  ClipboardCheck,
  Download,
  ExternalLink,
  Handshake,
  Link as LinkIcon,
  Plane,
  PlaneLanding,
  ShieldCheck,
  Stamp,
  Syringe,
  type LucideIcon,
} from "lucide-react";

import { titleFromSlug } from "@/components/site/content-page";
import { localHtml } from "@/components/site/prose";
import { getPathname } from "@/i18n/navigation";
import { ALL_COUNTRIES, getPage, localName, translatedTitle } from "@/lib/content";
import {
  host,
  parseAround,
  parseFlights,
  parseHealth,
  parseImageLinks,
  parseInfoIndex,
  parseLinkLists,
  parseStats,
  parseVisa,
  type FlightBlock,
  type InfoImage,
  type InfoLink,
  type VisaStatus,
} from "@/lib/info";
import { mediaUrl } from "@/lib/media";

type T = Awaited<ReturnType<typeof getTranslations>>;

/** The Info pages in the sidebar's order, each with its icon. */
export const INFO_PAGES: [slug: string, icon: LucideIcon][] = [
  ["impfung", Syringe],
  ["visa", Stamp],
  ["fluege", Plane],
  ["statistiken", ChartColumn],
  ["testberichte", ClipboardCheck],
  ["sponsoring", Handshake],
  ["links", LinkIcon],
];

function infoTitle(slug: string, locale: string) {
  return translatedTitle(`/info/${slug}`, locale) ?? titleFromSlug(slug);
}

function html(slug: string, locale: string) {
  return getPage(slug ? `/info/${slug}` : "/info", locale)?.html ?? "";
}

/** A link into the media store ("/media/6info/x.pdf"). */
const mediaHref = (href: string) => mediaUrl(decodeURI(href.replace(/^\/media\//, "")));

function Photo({ img, alt = img.alt }: { img: InfoImage; alt?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={mediaUrl(img.src)} alt={alt} width={img.width} height={img.height} loading="lazy" decoding="async" />;
}

function Html({ as: Tag = "p", html, locale, className }: { as?: "p" | "div" | "li" | "span"; html: string; locale: string; className?: string }) {
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: localHtml(html, locale) }} />;
}

/** The page head every Info page shares: kicker, title, lead, size. */
function InfoHead({ kicker, title, lead, meta }: { kicker: string; title: string; lead?: string; meta?: string }) {
  return (
    <header className="zb-gear-head zb-info-head">
      <p className="zb-gear-kicker">
        <span>{kicker}</span>
        {meta && <span className="zb-info-meta">{meta}</span>}
      </p>
      <h1>{title}</h1>
      {lead && <p className="zb-info-lead">{lead}</p>}
    </header>
  );
}

async function subpageHead(slug: string, locale: string, count: number) {
  const t = await getTranslations({ locale });
  return (
    <InfoHead
      kicker={t("nav.info")}
      title={infoTitle(slug, locale)}
      lead={t(`info.pages.${slug}.lead`)}
      meta={t(`info.pages.${slug}.count`, { count })}
    />
  );
}

/** An external link: a new window, said so to screen readers. */
function Outbound({ href, className, children, t }: { href: string; className?: string; children: React.ReactNode; t: T }) {
  return (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> ({t("info.external")})</span>
    </a>
  );
}

/* --------------------------------------------------------------- /info */

/** How many entries each page has, for its tile and its head. */
function counts(locale: string): Record<string, number> {
  return {
    impfung: parseHealth(html("impfung", locale)).reduce((n, s) => n + s.entries.length, 0),
    visa: parseVisa(html("visa", locale)).reduce((n, g) => n + g.countries.length, 0),
    fluege: parseFlights(html("fluege", locale)).flights.length,
    statistiken: parseStats(html("statistiken", locale)).reduce((n, s) => n + s.files.length, 0),
    testberichte: parseImageLinks(html("testberichte", locale)).length,
    sponsoring: parseImageLinks(html("sponsoring", locale)).length,
    links:
      parseImageLinks(html("links", locale)).length +
      parseLinkLists(html("links", locale)).reduce((n, l) => n + l.links.length, 0),
  };
}

/** The Info overview: the photo with the last update, then a tile per page. */
export async function InfoIndex({ locale, updated }: { locale: string; updated: string }) {
  const t = await getTranslations({ locale });
  const index = parseInfoIndex(html("", locale));
  const n = counts(locale);

  return (
    <div className="zb-gear zb-info">
      <InfoHead kicker={t("info.kicker")} title={t("section.info.title")} lead={t("section.info.lead")} />

      <div className={index.image ? "zb-gear-intro" : "zb-gear-intro zb-gear-intro--text"}>
        {index.image && (
          <figure className="zb-journal-photo">
            <Photo img={index.image} alt={index.caption ?? index.image.alt} />
            {index.caption && <figcaption>{index.caption}</figcaption>}
          </figure>
        )}
        <div className="zb-info-updated">
          <Clock className="size-5 flex-none" aria-hidden />
          <p>
            <span>{t("info.updated")}</span>
            <time>{updated}</time>
          </p>
        </div>
      </div>

      <ul className="zb-info-tiles">
        {INFO_PAGES.map(([slug, Icon]) => (
          <li key={slug}>
            <a href={getPathname({ href: `/info/${slug}`, locale })} className="zb-info-tile">
              <span className="zb-info-tile-icon">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="zb-info-tile-body">
                <strong>{infoTitle(slug, locale)}</strong>
                <span>{t(`info.pages.${slug}.lead`)}</span>
                <span className="zb-info-tile-meta">{t(`info.pages.${slug}.count`, { count: n[slug] })}</span>
              </span>
              <ArrowRight className="zb-info-tile-arrow size-4" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------- visa */

const STATUS_ICON: Record<VisaStatus, LucideIcon> = { free: ShieldCheck, visa: Stamp, arrival: PlaneLanding };

/** Names as the old pages spell them, without umlauts: "Türkei" -> "tuerkei". */
const fold = (s: string) => s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue");

/** Report pages by country name, in German and in the reader's language. */
function reportsByName(locale: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of ALL_COUNTRIES) {
    for (const name of [...c.name.split("/"), ...localName(c.slug, c.name, locale).split("/")]) {
      if (!map.has(fold(name))) map.set(fold(name), c.path);
    }
  }
  return map;
}

export async function InfoVisa({ locale }: { locale: string }) {
  const t = await getTranslations({ locale });
  const groups = parseVisa(html("visa", locale));
  if (!groups.length) notFound();
  const all = groups.flatMap((g) => g.countries);
  const reports = reportsByName(locale);
  const tally = (["free", "arrival", "visa"] as VisaStatus[]).map((s) => [s, all.filter((c) => c.status === s).length] as const);

  return (
    <div className="zb-gear zb-info">
      {await subpageHead("visa", locale, all.length)}

      <ul className="zb-info-legend" aria-label={infoTitle("visa", locale)}>
        {tally
          .filter(([, n]) => n)
          .map(([s, n]) => {
            const Icon = STATUS_ICON[s];
            return (
              <li key={s} className={`zb-visa-status zb-visa-status--${s}`}>
                <Icon className="size-3.5" aria-hidden />
                {t(`info.visa.${s}`)} <b>{n}</b>
              </li>
            );
          })}
      </ul>

      {groups.map((g, i) => (
        <section key={i} className="zb-info-section" aria-labelledby={`visa-${i}`}>
          <h2 id={`visa-${i}`} className="zb-info-h2">
            {i < 2 ? t(`info.visa.groups.${i}`) : null}
            <span className="zb-info-h2-meta">{t("info.pages.visa.count", { count: g.countries.length })}</span>
          </h2>
          {g.intro.map((p, j) => (
            <Html key={j} html={p} locale={locale} className="zb-info-intro" />
          ))}
          <ul className="zb-visa-grid">
            {g.countries.map((c) => {
              const Icon = c.status && STATUS_ICON[c.status];
              const report = reports.get(fold(c.name));
              return (
                <li key={c.name} className="zb-gear-card zb-visa-card">
                  <header className="zb-gear-card-head">
                    <h3>{c.name}</h3>
                    {c.status && Icon && (
                      <span className={`zb-visa-status zb-visa-status--${c.status}`}>
                        <Icon className="size-3.5" aria-hidden />
                        {t(`info.visa.${c.status}`)}
                      </span>
                    )}
                  </header>
                  <div className="zb-visa-body">
                    {(c.passport || c.stay) && (
                      <p className="zb-visa-facts">
                        {c.passport && <span>{t("info.visa.passport", { months: c.passport })}</span>}
                        {c.stay && <span>{t("info.visa.stay", { days: c.stay })}</span>}
                      </p>
                    )}
                    <Html html={c.html} locale={locale} className="zb-visa-rules" />
                    {report && (
                      <a href={getPathname({ href: report, locale })} className="zb-info-more">
                        {t("info.visa.report")}
                        <ArrowRight className="size-3.5" aria-hidden />
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* --------------------------------------------------------- vaccinations */

export async function InfoHealth({ locale }: { locale: string }) {
  const t = await getTranslations({ locale });
  const sections = parseHealth(html("impfung", locale));
  if (!sections.length) notFound();

  return (
    <div className="zb-gear zb-info">
      {await subpageHead("impfung", locale, sections.reduce((n, s) => n + s.entries.length, 0))}

      {sections.map((s, i) => (
        <section key={i} className="zb-gear-card zb-health-card" aria-labelledby={`health-${i}`}>
          <header className="zb-gear-card-head">
            <h2 id={`health-${i}`}>{s.title}</h2>
            <span className="zb-info-count">{t("info.pages.impfung.count", { count: s.entries.length })}</span>
          </header>
          {s.countries.length > 0 && (
            <div className="zb-health-countries">
              <p>{t("info.health.countries")}</p>
              <ul>
                {s.countries.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}
          <dl className="zb-info-specs">
            {s.entries.map((e, j) => (
              <div key={j}>
                <dt>
                  {e.name}
                  {e.where && <span>{e.where}</span>}
                </dt>
                <dd>{e.text}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- flights */

function FlightBlockView({ block, locale, t }: { block: FlightBlock; locale: string; t: T }) {
  switch (block.kind) {
    case "text":
      return <Html html={block.html} locale={locale} />;
    case "steps":
      return (
        <ol className="zb-flight-steps">
          {block.html.map((l, i) => (
            <Html key={i} as="li" html={l.replace(/^\d+\.\s*/, "")} locale={locale} />
          ))}
        </ol>
      );
    case "questions":
      return (
        <ul className="zb-flight-questions">
          {block.html.map((l, i) => (
            <Html key={i} as="li" html={l} locale={locale} />
          ))}
        </ul>
      );
    case "allowance":
      return (
        <div className="zb-flight-allowance">
          <p>{t("info.flights.allowance")}</p>
          <ul>
            {block.html.map((l, i) => (
              <Html key={i} as="li" html={l} locale={locale} />
            ))}
          </ul>
        </div>
      );
    case "quote":
      return (
        <figure className="zb-flight-quote">
          <Html as="div" html={block.html} locale={locale} />
          <figcaption>{block.label}</figcaption>
        </figure>
      );
  }
}

export async function InfoFlights({ locale }: { locale: string }) {
  const t = await getTranslations({ locale });
  const { title, flights, blocks } = parseFlights(html("fluege", locale));
  if (!flights.length && !blocks.length) notFound();

  return (
    <div className="zb-gear zb-info">
      {await subpageHead("fluege", locale, flights.length)}

      {flights.length > 0 && (
        <section className="zb-gear-card zb-flight-plan" aria-labelledby="flight-plan">
          <header className="zb-gear-card-head">
            <h2 id="flight-plan">{title ?? t("info.flights.plan")}</h2>
            <Plane className="size-4" aria-hidden />
          </header>
          <ol>
            {flights.map((f, i) => (
              <li key={i}>
                <span className="zb-flight-when">{f.when}</span>
                <span className="zb-flight-leg">
                  <span>
                    <span className="sr-only">{t("info.flights.from")} </span>
                    {f.from}
                  </span>
                  <ArrowRight className="size-4 flex-none" aria-hidden />
                  <span>
                    <span className="sr-only">{t("info.flights.to")} </span>
                    {f.to}
                  </span>
                </span>
                <span className="zb-flight-number">
                  <span className="sr-only">{t("info.flights.flight")} </span>
                  {f.number}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <article className="zb-info-article">
        {blocks.map((b, i) => (
          <FlightBlockView key={i} block={b} locale={locale} t={t} />
        ))}
      </article>
    </div>
  );
}

/* ----------------------------------------------------------- statistics */

export async function InfoStats({ locale }: { locale: string }) {
  const t = await getTranslations({ locale });
  const sheets = parseStats(html("statistiken", locale));
  if (!sheets.length) notFound();

  return (
    <div className="zb-gear zb-info">
      {await subpageHead("statistiken", locale, sheets.reduce((n, s) => n + s.files.length, 0))}

      <ul className="zb-stat-grid">
        {sheets.map((s) => (
          <li key={s.label} className="zb-gear-card zb-stat-card">
            <div className="zb-gear-tile-photo">{s.image && <Photo img={s.image} alt="" />}</div>
            <div className="zb-stat-body">
              <h2>{s.label}</h2>
              <ul>
                {s.files.map((f) => (
                  <li key={f.href}>
                    <a href={mediaHref(f.href)} className="zb-info-download" target="_blank" rel="noopener">
                      <Download className="size-4" aria-hidden />
                      {f.label}
                      <span className="zb-info-download-type">{t("info.pdf")}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------- product tests */

export async function InfoReviews({ locale }: { locale: string }) {
  const t = await getTranslations({ locale });
  const reviews = parseImageLinks(html("testberichte", locale));
  if (!reviews.length) notFound();

  return (
    <div className="zb-gear zb-info">
      {await subpageHead("testberichte", locale, reviews.length)}

      <ul className="zb-review-grid">
        {reviews.map((r) => (
          <li key={r.href}>
            <a href={mediaHref(r.href)} className="zb-review-tile" target="_blank" rel="noopener">
              <span className="zb-review-photo">{r.image && <Photo img={r.image} alt="" />}</span>
              <span className="zb-review-body">
                <strong>{r.label}</strong>
                <span className="zb-info-download-type">
                  <Download className="size-3.5" aria-hidden />
                  {t("info.pdf")}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* --------------------------------------------------- sponsors and links */

function LogoWall({ logos, t }: { logos: InfoLink[]; t: T }) {
  return (
    <ul className="zb-logo-wall">
      {logos.map((l) => (
        <li key={l.href}>
          <Outbound href={l.href} className="zb-logo-tile" t={t}>
            <span className="zb-logo-img">{l.image && <Photo img={l.image} alt={l.label} />}</span>
            <span className="zb-logo-host">{host(l.href)}</span>
          </Outbound>
        </li>
      ))}
    </ul>
  );
}

export async function InfoSponsors({ locale }: { locale: string }) {
  const t = await getTranslations({ locale });
  const source = html("sponsoring", locale);
  const logos = parseImageLinks(source);
  if (!logos.length) notFound();
  const { before, after } = parseAround(source);

  return (
    <div className="zb-gear zb-info">
      {await subpageHead("sponsoring", locale, logos.length)}
      {before.map((p, i) => (
        <Html key={i} html={p} locale={locale} className="zb-info-intro" />
      ))}
      <LogoWall logos={logos} t={t} />
      {after.length > 0 && (
        <aside className="zb-info-cta">
          <Handshake className="size-6 flex-none" aria-hidden />
          <div>
            {after.map((p, i) => (
              <Html key={i} html={p} locale={locale} />
            ))}
            <a href={getPathname({ href: "/varia/kontakt", locale })} className="zb-reports-more">
              {t("info.sponsoring.cta")}
              <ArrowRight className="size-4" aria-hidden />
            </a>
          </div>
        </aside>
      )}
    </div>
  );
}

export async function InfoLinks({ locale }: { locale: string }) {
  const t = await getTranslations({ locale });
  const source = html("links", locale);
  const logos = parseImageLinks(source);
  const lists = parseLinkLists(source);
  if (!logos.length && !lists.length) notFound();
  const total = logos.length + lists.reduce((n, l) => n + l.links.length, 0);

  return (
    <div className="zb-gear zb-info">
      {await subpageHead("links", locale, total)}

      {logos.length > 0 && (
        <section className="zb-info-section" aria-labelledby="links-partners">
          <h2 id="links-partners" className="zb-info-h2">
            {t("info.links.partners")}
            <span className="zb-info-h2-meta">{t("info.pages.links.count", { count: logos.length })}</span>
          </h2>
          <LogoWall logos={logos} t={t} />
        </section>
      )}

      <div className="zb-link-lists">
        {lists.map((list, i) => (
          <section key={i} className="zb-gear-card zb-link-card" aria-labelledby={`links-${i}`}>
            <header className="zb-gear-card-head">
              <h2 id={`links-${i}`}>{list.title}</h2>
              <span className="zb-info-count">{list.links.length}</span>
            </header>
            <ul>
              {list.links.map((l) => (
                <li key={l.href + l.label}>
                  <Outbound href={l.href} className="zb-link-row" t={t}>
                    <span className="zb-link-label">{l.label}</span>
                    <span className="zb-link-host">
                      {host(l.href)}
                      <ExternalLink className="size-3.5 flex-none" aria-hidden />
                    </span>
                  </Outbound>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

/** Which component draws which Info page. */
export const INFO_VIEWS: Record<string, (props: { locale: string }) => Promise<React.ReactNode>> = {
  impfung: InfoHealth,
  visa: InfoVisa,
  fluege: InfoFlights,
  statistiken: InfoStats,
  testberichte: InfoReviews,
  sponsoring: InfoSponsors,
  links: InfoLinks,
};
