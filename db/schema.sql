-- SciCard card store. The app also creates this table on first use.
-- Run once against Neon (or any Postgres) before production traffic:
--   psql "$DATABASE_URL" -f db/schema.sql

create table if not exists scicard_cards (
  id text primary key,
  updated_at timestamptz not null,
  data jsonb not null
);

create index if not exists scicard_cards_updated_at_idx
  on scicard_cards (updated_at desc);
