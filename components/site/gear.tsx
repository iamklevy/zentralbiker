import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AlertTriangle, Weight } from "lucide-react";

import { titleFromSlug } from "@/components/site/content-page";
import { getPathname } from "@/i18n/navigation";
import { getPage, translatedTitle } from "@/lib/content";
import { GEAR_CODES, parseGearIndex, parseGearPage, type GearBlock, type GearImage, type GearItem } from "@/lib/equipment";
import { mediaUrl } from "@/lib/media";

const SLUGS = Object.keys(GEAR_CODES);

function gearTitle(slug: string, locale: string) {
  return translatedTitle(`/ausruestung/${slug}`, locale) ?? titleFromSlug(slug);
}

function GearPhoto({ img }: { img: GearImage }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={mediaUrl(img.src)} alt={img.alt} width={img.width} height={img.height} loading="lazy" decoding="async" />;
}

/** One product (or kit) as a data-sheet card. */
function GearCard({ item, fallbackName, t }: { item: GearItem; fallbackName: string; t: (key: string) => string }) {
  return (
    <article className="zb-gear-card" id={item.code}>
      <header className="zb-gear-card-head">
        <span className="zb-gear-code">{item.code}</span>
        <h2>{item.name ?? fallbackName}</h2>
        {item.weight && (
          <span className="zb-gear-weight" title={t("gear.weight")}>
            <Weight className="size-3.5" aria-hidden />
            <span className="sr-only">{t("gear.weight")}: </span>
            {item.weight}
          </span>
        )}
      </header>
      <div className={item.images.length ? "zb-gear-card-body" : "zb-gear-card-body zb-gear-card-body--text"}>
        {item.images.length > 0 && (
          <div className="zb-gear-photo">
            {item.images.map((img) => (
              <GearPhoto key={img.src} img={img} />
            ))}
          </div>
        )}
        <div className="zb-gear-info">
          {item.text.map((p, i) => (
            <p key={i} className="zb-gear-desc">
              {p}
            </p>
          ))}
          {item.features.length > 0 && (
            <ul className="zb-gear-features">
              {item.features.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          )}
          {item.specs.length > 0 && (
            <dl className="zb-gear-specs">
              {item.specs.map((s, i) => (
                <div key={i}>
                  <dt>{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {item.extras && (
            <div className="zb-gear-extras">
              <p>{item.extras.title ?? t("gear.also")}</p>
              <ul>
                {item.extras.lines.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function GearBlockView({ block, title, t }: { block: GearBlock; title: string; t: (key: string) => string }) {
  switch (block.kind) {
    case "item":
      return <GearCard item={block.item} fallbackName={title} t={t} />;
    case "text":
      return (
        <div className="zb-gear-text">
          {block.lines.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
      );
    case "note":
      return (
        <p className="zb-gear-note">
          <AlertTriangle className="size-4 flex-none" aria-hidden />
          {block.text}
        </p>
      );
    case "table":
      return (
        <div className="zb-gear-table-wrap">
          <table className="zb-gear-table">
            <thead>
              <tr>
                {block.table.columns.map((c, i) => (
                  <th key={i} scope="col">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            {block.table.groups.map((g, i) => (
              <tbody key={i}>
                {g.title && (
                  <tr className="zb-gear-group">
                    <th colSpan={block.table.columns.length} scope="rowgroup">
                      {g.title}
                    </th>
                  </tr>
                )}
                {g.rows.map((r, j) => (
                  <tr key={j}>
                    {r.map((c, k) => (
                      <td key={k}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      );
  }
}

/** Sheet header: the category's part-number prefix, its name, its size. */
function SheetHead({ code, title, meta, kicker }: { code: string; title: string; meta?: string; kicker: string }) {
  return (
    <header className="zb-gear-head">
      <p className="zb-gear-kicker">
        <span>{kicker}</span>
        <span className="zb-gear-code">{code}</span>
      </p>
      <h1>{title}</h1>
      {meta && <p className="zb-gear-meta">{meta}</p>}
    </header>
  );
}

function summary(slug: string, locale: string) {
  const page = getPage(`/ausruestung/${slug}`, locale);
  const blocks = page ? parseGearPage(page.html, slug) : [];
  const items = blocks.flatMap((b) => (b.kind === "item" ? [b.item] : []));
  const rows = blocks.reduce((n, b) => n + (b.kind === "table" ? b.table.groups.reduce((m, g) => m + g.rows.length, 0) : 0), 0);
  const entries = rows + items.reduce((n, i) => n + i.specs.length + i.features.length, 0);
  return { blocks, items, entries, image: items.find((i) => i.images.length)?.images[0] };
}

/** An equipment category as a data sheet. */
export async function GearSheet({ slug, locale }: { slug: string; locale: string }) {
  const t = await getTranslations({ locale });
  const { blocks, items, entries } = summary(slug, locale);
  if (!blocks.length) notFound();
  const title = gearTitle(slug, locale);
  const meta =
    items.length > 1 ? t("gear.items", { count: items.length }) : t("gear.entries", { count: entries });

  return (
    <div className="zb-gear">
      <SheetHead code={GEAR_CODES[slug]} title={title} meta={meta} kicker={t("gear.sheet")} />
      {blocks.map((b, i) => (
        <GearBlockView key={i} block={b} title={title} t={t} />
      ))}
    </div>
  );
}

/** The equipment overview: the intro, then every category as a tile. */
export async function GearIndex({ locale }: { locale: string }) {
  const t = await getTranslations({ locale });
  const page = getPage("/ausruestung", locale);
  const index = page ? parseGearIndex(page.html) : { intro: [] };

  return (
    <div className="zb-gear">
      <SheetHead code={`${SLUGS.length} × ${t("gear.sheet")}`} title={t("nav.ausruestung")} kicker={t("gear.overview")} />

      <div className={index.image ? "zb-gear-intro" : "zb-gear-intro zb-gear-intro--text"}>
        <div className="zb-gear-text">
          {index.intro.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {index.partner && (
            <a className="zb-gear-partner" href={index.partner.href} target="_blank" rel="noopener noreferrer">
              <span>{t("gear.partner")}</span>
              {index.partner.logo ? <GearPhoto img={index.partner.logo} /> : index.partner.href}
            </a>
          )}
        </div>
        {index.image && (
          <div className="zb-gear-photo">
            <GearPhoto img={index.image} />
          </div>
        )}
      </div>

      <ul className="zb-gear-tiles">
        {SLUGS.map((slug) => {
          const s = summary(slug, locale);
          const weight = s.items.length === 1 ? s.items[0].weight : undefined;
          return (
            <li key={slug}>
              <a href={getPathname({ href: `/ausruestung/${slug}`, locale })} className="zb-gear-tile">
                <span className="zb-gear-tile-photo">
                  {s.image ? <GearPhoto img={s.image} /> : <span className="zb-gear-code">{GEAR_CODES[slug]}</span>}
                </span>
                <span className="zb-gear-tile-body">
                  <span className="zb-gear-code">{GEAR_CODES[slug]}</span>
                  <strong>{gearTitle(slug, locale)}</strong>
                  <span className="zb-gear-tile-meta">
                    {s.items.length > 1 ? t("gear.items", { count: s.items.length }) : t("gear.entries", { count: s.entries })}
                    {weight && ` · ${weight}`}
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
