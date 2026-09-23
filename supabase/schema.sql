-- Zentralbiker — database schema
--
-- Two tables, both written only through Server Actions using the service-role
-- key. RLS is enabled and deliberately left with no permissive policy: the
-- anon/authenticated roles must never reach these rows directly, and the
-- service-role key bypasses RLS by design. If a browser-side client is ever
-- added, add explicit policies then rather than loosening these now.

-- ---------------------------------------------------------------- guestbook

create table if not exists guestbook_entries (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null check (char_length(name) between 1 and 80),
  location    text                 check (location is null or char_length(location) <= 80),
  message     text        not null check (char_length(message) between 1 and 2000),
  -- Entries are held until a site owner approves them. The public list only
  -- ever selects approved rows, so spam never appears even before deletion.
  approved    boolean     not null default false,
  created_at  timestamptz not null default now(),
  -- Kept only for rate limiting and abuse triage, never displayed.
  ip_hash     text,
  user_agent  text
);

create index if not exists guestbook_public_idx
  on guestbook_entries (created_at desc)
  where approved;

-- Supports the per-IP rate-limit lookup in lib/guestbook/actions.ts.
create index if not exists guestbook_ip_recent_idx
  on guestbook_entries (ip_hash, created_at desc);

alter table guestbook_entries enable row level security;

-- --------------------------------------------------------------- newsletter

create table if not exists newsletter_subscribers (
  id            uuid primary key default gen_random_uuid(),
  email         text        not null unique,
  -- Double opt-in: a row exists from the moment someone submits the form, but
  -- it is only mailable once confirmed_at is set via the emailed token.
  token         text        not null unique,
  confirmed_at  timestamptz,
  created_at    timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create index if not exists newsletter_confirmed_idx
  on newsletter_subscribers (confirmed_at)
  where confirmed_at is not null and unsubscribed_at is null;

alter table newsletter_subscribers enable row level security;
