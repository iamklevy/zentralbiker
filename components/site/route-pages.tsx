import { getTranslations } from "next-intl/server";
import { ArrowLeft, ArrowRight, BedDouble, Bus, House, Maximize2, Stamp, Tent, TrainFront } from "lucide-react";

import { getPathname } from "@/i18n/navigation";
import { LEGS, legOf, localName, type Country, type Leg } from "@/lib/content";
import { mediaUrl } from "@/lib/media";
import { RouteTrackMap } from "@/components/site/route-track-map";
import {
  legCards,
  legMap,
  routeCountries,
  routeCountry,
  routeKm,
  routeNeighbours,
  routeTracks,
  type Night,
  type RouteCountry,
  type Stage,
  type StageTable,
} from "@/lib/route";

type T = Awaited<ReturnType<typeof getTranslations>>;

const NIGHT_ICONS: Record<Night, typeof Tent | null> = {
  hotel: BedDouble,
  tent: Tent,
  guesthouse: House,
  border: Stamp,
  bus: Bus,
  train: TrainFront,
  other: null,
};

/** 12512 -> "12'512" (de) / "12,512" (en), as the old pages wrote numbers. */
const formatKm = (n: number, locale: string) => n.toLocaleString(locale === "de" ? "de-CH" : "en-GB").replace(/’/g, "'");

/** Kilometres of a whole leg, added up from its countries' routes. */
function legKm(leg: Leg, locale: string) {
  return routeCountries(leg).reduce((n, c) => n + routeKm(routeCountry(c, locale)?.route), 0);
}

/** Big figures in a row: "2'012 Kilometer · 37'080 Höhenmeter Aufstieg …". */
function Stats({ items }: { items: { value: string; label: string }[] }) {
  const shown = items.filter((i) => i.value);
  if (!shown.length) return null;
  return (
    <dl className="zb-route-stats">
      {shown.map((i) => (
        <div key={i.label}>
          <dt>{i.label}</dt>
          <dd>{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------------------------------------- /route */

/**
 * The route overview, laid out like Berichte: one diary entry per leg, its
 * map card taped in on the left, the distance and countries beside it.
 */
export async function RouteOverview({ locale }: { locale: string }) {
  const t = await getTranslations({ locale });
  const cards = legCards(locale);
  const total = LEGS.reduce((n, leg) => n + legKm(leg, locale), 0);
  const countries = LEGS.reduce((n, leg) => n + routeCountries(leg).length, 0);

  return (
    <div className="zb-journal zb-reports">
      <header className="zb-reports-head">
        <p className="zb-journal-kicker">
          {LEGS.length} {t("home.stats.legs")} · {countries} {t("route.stat.countries")} · {formatKm(total, locale)} km
        </p>
        <h1 className="zb-journal-name">{t("section.route.title")}</h1>
        <p className="zb-reports-lead">{t("section.route.lead")}</p>
      </header>

      {LEGS.map((leg) => {
        const name = localName(leg.slug, leg.name, locale);
        const href = getPathname({ href: `/route/${leg.slug}`, locale });
        const list = routeCountries(leg);
        return (
          <article key={leg.slug} id={leg.slug} className="zb-journal-entry zb-reports-leg">
            {cards[leg.slug] && (
              <figure className="zb-journal-photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl(cards[leg.slug])} alt="" loading="lazy" decoding="async" />
                <figcaption>{name}</figcaption>
              </figure>
            )}
            <div className="zb-journal-text">
              <p className="zb-journal-kicker">
                {t("leg.countries", { count: list.length })} · {formatKm(legKm(leg, locale), locale)} km
              </p>
              <h2 className="zb-reports-title">
                <a href={href}>{name}</a>
              </h2>
              <ul className="zb-reports-countries">
                {list.map((c) => (
                  <li key={c.slug}>
                    <a href={getPathname({ href: `/route/${c.slug}`, locale })}>{localName(c.slug, c.name, locale)}</a>
                  </li>
                ))}
              </ul>
              <a href={href} className="zb-reports-more">
                {t("leg.route")}
                <ArrowRight className="size-4" aria-hidden />
              </a>
            </div>
          </article>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------- /route/<leg> */

/** A leg: its whole route on one map, then a card per country. */
export async function RouteLeg({ leg, locale }: { leg: Leg; locale: string }) {
  const t = await getTranslations({ locale });
  const map = legMap(leg, locale);
  const list = routeCountries(leg).map((c) => ({ country: c, page: routeCountry(c, locale) }));
  const stages = list.reduce((n, { page }) => n + (page?.tables.reduce((m, tb) => m + tb.stages.length, 0) ?? 0), 0);

  return (
    <div className="zb-route">
      <header className="zb-reports-head">
        <p className="zb-journal-kicker">{t("section.route.title")}</p>
        <h1 className="zb-journal-name">{localName(leg.slug, leg.name, locale)}</h1>
      </header>

      <Stats
        items={[
          { value: formatKm(legKm(leg, locale), locale), label: t("route.stat.km") },
          { value: String(list.length), label: t("route.stat.countries") },
          { value: stages ? String(stages) : "", label: t("route.stat.stages") },
        ]}
      />

      {map && <RouteMap map={map} t={t} />}

      <h2 className="zb-journal-rule">
        <span>{t("route.countries_title")}</span>
      </h2>
      <ul className="zb-route-countries">
        {list.map(({ country, page }) => {
          const flag = page?.countries[0]?.flag;
          const km = routeKm(page?.route);
          return (
            <li key={country.slug}>
              <a href={getPathname({ href: `/route/${country.slug}`, locale })}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {flag ? <img src={mediaUrl(flag.src)} alt="" loading="lazy" decoding="async" /> : <span className="zb-route-noflag" />}
                <strong>{localName(country.slug, country.name, locale)}</strong>
                {km > 0 && <span>{formatKm(km, locale)} km</span>}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RouteMap({ map, credit, t }: { map: RouteCountry["maps"][number]; credit?: RouteCountry["credit"]; t: T }) {
  const src = mediaUrl(map.src);
  return (
    <figure className="zb-route-map">
      <a href={src} target="_blank" rel="noopener noreferrer" title={t("route.open_map")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={map.alt} width={map.width} height={map.height} loading="lazy" decoding="async" />
        <span className="zb-route-map-zoom" aria-hidden>
          <Maximize2 className="size-4" />
        </span>
        <span className="sr-only">{t("route.open_map")}</span>
      </a>
      {credit && (
        <figcaption>
          <a href={credit.href} target="_blank" rel="noopener noreferrer">
            {credit.text}
          </a>
        </figcaption>
      )}
    </figure>
  );
}

/* ----------------------------------------------------- /route/<country> */

const isRest = (s: Stage) => !s.distance || s.distance === "0";

function NightBadge({ night, t }: { night?: Night; t: T }) {
  if (!night) return null;
  const Icon = NIGHT_ICONS[night];
  return (
    <span className={`zb-night zb-night--${night}`}>
      {Icon && <Icon className="size-4" aria-hidden />}
      {t(`route.night.${night}`)}
    </span>
  );
}

function StagesTable({ table, t }: { table: StageTable; t: T }) {
  const cols = ["distance", "gain", "altitude", "time"] as const;
  return (
    <section className="zb-route-section">
      <h2 className="zb-route-h2">
        {t("route.stages")} {table.year}
      </h2>
      <p className="zb-route-swipe">{t("route.swipe")}</p>
      <div className="zb-route-table-wrap">
        <table className="zb-route-table">
          <thead>
            <tr>
              <th scope="col">{t("route.col.date")}</th>
              <th scope="col">{t("route.col.place")}</th>
              {cols.map((c) => (
                <th key={c} scope="col" className="num">
                  <abbr title={t(`route.col_hint.${c}`)}>{t(`route.col.${c}`)}</abbr>
                </th>
              ))}
              <th scope="col">{t("route.col.night")}</th>
              <th scope="col" className="num">
                <abbr title={t("route.col_hint.temperature")}>{t("route.col.temperature")}</abbr>
              </th>
              <th scope="col">{t("route.col.comment")}</th>
            </tr>
          </thead>
          <tbody>
            {table.stages.map((s, i) => (
              <tr key={i} className={isRest(s) ? "is-rest" : undefined}>
                <td className="date">{s.date}</td>
                <th scope="row">{s.place}</th>
                {cols.map((c) => (
                  <td key={c} className="num">
                    {s[c]}
                  </td>
                ))}
                <td>
                  <NightBadge night={s.night} t={t} />
                </td>
                <td className="num">{s.temperature}</td>
                <td className="comment">{s.comment}</td>
              </tr>
            ))}
          </tbody>
          {table.total && (
            <tfoot>
              <tr>
                <th scope="row" colSpan={2}>
                  {table.total.place || t("route.total")}
                </th>
                {cols.map((c) => (
                  <td key={c} className="num">
                    {table.total![c]}
                  </td>
                ))}
                <td colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}

/** A country: who and where, the route ridden, its map and its daily stages. */
export async function RouteCountryPage({ country, page, locale }: { country: Country; page: RouteCountry; locale: string }) {
  const t = await getTranslations({ locale });
  const leg = legOf(country.slug);
  const name = localName(country.slug, country.name, locale);
  const flag = page.countries[0]?.flag;
  const total = page.tables.find((tb) => tb.total)?.total;
  const stages = page.tables.reduce((n, tb) => n + tb.stages.filter((s) => !isRest(s)).length, 0);
  const { prev, next } = routeNeighbours(country.slug);
  const tracks = routeTracks(country, locale);

  return (
    <div className="zb-route">
      <header className="zb-route-head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {flag && <img className="zb-route-flag" src={mediaUrl(flag.src)} alt="" />}
        <div>
          <p className="zb-journal-kicker">
            {t("section.route.title")}
            {leg && ` · ${localName(leg.slug, leg.name, locale)}`}
          </p>
          <h1 className="zb-journal-name">{name}</h1>
        </div>
      </header>

      <Stats
        items={[
          { value: page.route ? formatKm(routeKm(page.route), locale) : (total?.distance ?? ""), label: t("route.stat.km") },
          { value: total?.gain ?? "", label: t("route.stat.gain") },
          { value: total?.time ?? "", label: t("route.stat.time") },
          { value: stages ? String(stages) : "", label: t("route.stat.stages") },
        ]}
      />

      <div className="zb-route-intro">
        <div className="zb-route-facts">
          {page.countries.map((c, i) => (
            <section key={i} className="zb-route-card">
              <h2>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {c.flag && <img src={mediaUrl(c.flag.src)} alt="" />}
                {/* one box: the country itself, in its proper spelling */}
                {page.countries.length === 1 ? name : c.name || name}
              </h2>
              <dl>
                {c.facts.map((f) => (
                  <div key={f.label}>
                    <dt>{f.label}</dt>
                    <dd>{f.value}</dd>
                  </div>
                ))}
              </dl>
              {c.notes.map((n) => (
                <p key={n} className="zb-route-note">
                  {n}
                </p>
              ))}
            </section>
          ))}
        </div>

        {page.route && (
          <section className="zb-route-card zb-route-stops">
            <h2>
              {t("route.stops")}
              {page.route.note && <span> · {/rund/i.test(page.route.note) ? t("route.round_trip") : page.route.note}</span>}
            </h2>
            {page.route.parts.map((part, p) => (
              <div key={p} className="zb-route-part">
                <ol>
                  {part.stops.map((s, i) => (
                    <li key={i}>
                      {s.place}
                      {s.border && <span className="zb-route-border">{s.border}</span>}
                    </li>
                  ))}
                </ol>
                {/* with one part the figures above already say it */}
                {page.route!.parts.length > 1 && <p className="zb-route-part-km">{part.km} km</p>}
              </div>
            ))}
          </section>
        )}
      </div>

      {page.maps.map((m) => (
        <RouteMap key={m.src} map={m} credit={page.credit} t={t} />
      ))}

      {tracks.length > 0 && (
        <section className="zb-route-section">
          <h2 className="zb-route-h2">{t("route.track_title")}</h2>
          <RouteTrackMap
            tracks={tracks}
            locale={locale}
            labels={{
              all: t("route.track_all"),
              title: t("route.track_title"),
              distance: t("route.track.distance"),
              duration: t("route.track.duration"),
              moving: t("route.track.moving"),
              speed: t("route.track.speed"),
              up: t("route.track.up"),
              down: t("route.track.down"),
              height: t("route.track.height"),
              hint: t("route.track.hint"),
            }}
          />
        </section>
      )}

      {page.tables.map((tb, i) => (
        <StagesTable key={i} table={tb} t={t} />
      ))}

      <nav className="zb-route-pager" aria-label={t("nav.sub")}>
        {prev ? (
          <a href={getPathname({ href: `/route/${prev.slug}`, locale })}>
            <ArrowLeft className="size-4" aria-hidden />
            <span>
              <small>{t("route.prev")}</small>
              {localName(prev.slug, prev.name, locale)}
            </span>
          </a>
        ) : (
          <span />
        )}
        {next && (
          <a href={getPathname({ href: `/route/${next.slug}`, locale })} className="is-next">
            <span>
              <small>{t("route.next")}</small>
              {localName(next.slug, next.name, locale)}
            </span>
            <ArrowRight className="size-4" aria-hidden />
          </a>
        )}
      </nav>
    </div>
  );
}
