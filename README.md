# Zentralbiker

A rebuild of [zentralbiker.ch](https://www.zentralbiker.ch) — travel reports, photos and
routes from a round-the-world bicycle journey — on the same stack as `mediaprint-next`:
Next.js 16 (App Router), React 19, Tailwind v4, shadcn/Radix, next-intl, Supabase and Resend.

The original is a hand-coded, Dreamweaver-era static site: nested layout tables, spacer GIFs,
inline `<font>` tags, and the navigation copy-pasted into the body of all 149 pages. None of
that survives here. The **content** does.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase + Resend
npm run dev
```

The site needs two build inputs that are not in git — see [Migration](#migration).

## Architecture

| Path | What it holds |
| --- | --- |
| `app/[locale]/` | Every page. German is un-prefixed (`/berichte/peru`), English and French sit under `/en` and `/fr`. |
| `content/generated/` | Output of the migration: `pages.json`, `journey.json`, `galleries.json`. Regenerate, don't hand-edit. |
| `lib/content.ts` | Typed access layer over those three files — every lookup the routes use. |
| `components/site/` | Site chrome, prose renderer, gallery/lightbox, the three forms. |
| `scripts/` | The migration pipeline. |
| `supabase/schema.sql` | Guestbook + newsletter tables. |

### Routing

Reports, routes and galleries all key off the number the old site encoded in its filenames:
`3NN` is a country's written report, `5NN` the same country's route page, `4NN` its photo
gallery. That numbering is the only join key the original had, so it is what the content model
is built on — see `scripts/build-content.mjs`.

`/berichte/[slug]` and `/route/[slug]` each serve two kinds of page, because the old URLs did
too: `/berichte/amerika` is a leg index, `/berichte/peru` a country report. The slug spaces
don't overlap.

### Locales

German is the default and stays un-prefixed, because the old site served German at `/` for
years and its inbound links and search rankings all point there. **Content negotiation is
deliberately off** (`localeDetection: false` in `i18n/routing.ts`): with it on, the same URL
Google has indexed as German would answer in English to an English browser. English and French
are reached through the explicit prefixes and the `hreflang` alternates in the layout metadata.

Only the interface is translated into all three languages. The travel reports themselves are
the authors' own German writing and are served as-is in every locale — machine-translating a
personal diary is not something this migration should invent.

## Migration

Two inputs are gitignored because they are large and reproducible:

- `.mirror/` — a local copy of the old site (HTML + assets)
- `public/media/` — ~600 MB of photographs, which the migrated content references as `/media/...`

Rebuild both:

```bash
npm run migrate      # .mirror -> content/generated/*.json
npm run sync-media   # .mirror -> public/media
```

`scripts/extract.mjs` reduces each old page to a title, a clean semantic HTML body and its
image list. Two things there are worth knowing:

- It **slices** the content region out of the raw file rather than querying a parsed tree.
  Around 20% of the pages have unbalanced tags, and a forgiving DOM parser reacts by dropping
  whole subtrees — `querySelector("#navi-sdf")` returned `null` on 32 pages that plainly
  contain that div.
- Layout tables are unwrapped by rewriting `innerHTML`, never by rebuilding from queried cells.
  Some tables are malformed enough that the parser hoists the rows out, so a cell query sees a
  fraction of the content; reconstructing from that dropped ~90% of some pages. There is a
  guard that leaves a table alone if unwrapping it would cost text.

`scripts/build-content.mjs` joins the sections and pairs each photo with its thumbnail. The
galleries use two different thumbnail conventions at once — a `thumb_<country>` prefix and a
`-tn` suffix — with inconsistent extension case, so pairing is done on extension-stripped
stems. 4,013 of 4,059 photos pair; the rest have no thumbnail on the original server and fall
back to the full image.

### Video

The original also carries 47 `.mp4` files (~425 MB). They are **excluded** from the mirror and
from `public/media`: that much video does not belong in a git repository or a serverless
deploy. Host them on Supabase Storage (already a dependency) or a CDN and point the `/media`
references at it.

## Interactive features

These three were static or third-party-hosted on the old site and are rebuilt here:

- **Gästebuch** — Supabase-backed, honeypot + one-post-per-minute-per-IP rate limiting, and
  entries are held for moderation (`approved` defaults to `false`; flip it to publish).
  Visitor text is rendered as a React text node, never as HTML.
- **Newsletter** — double opt-in. A row is created on submit but is only mailable once the
  emailed token is confirmed via `/api/newsletter/confirm`.
- **Kontakt** — delivers through Resend to `CONTACT_TO`, with the sender's address in
  `replyTo` (putting it in `from` would fail SPF/DKIM).

IP addresses are hashed, not stored — rate limiting needs to recognise a repeat poster, not
identify them.

### Database

Apply `supabase/schema.sql`. RLS is enabled on both tables with no permissive policy on
purpose: all access goes through Server Actions using the service-role key, which bypasses RLS
by design. If a browser-side client is ever added, write explicit policies then.

## Deployment

Set the environment variables from `.env.example`, then make `public/media` available — either
by running `npm run sync-media` as a build step with the mirror present, or by serving
`/media/*` from object storage via a rewrite in `next.config.ts`.
