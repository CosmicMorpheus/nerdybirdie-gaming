-- Optional Pro unlock (founder decision A, 27 Nov 2026). The guides stay free; this records verified store purchases and
-- manual grants, so a Pro owner keeps access on every device. NOT applied anywhere yet: run it in the staging project first.
--
-- Rules enforced HERE, not in the app:
--   * Customers can read only their own purchases and grants. They can never write them.
--   * Only server functions (service role, which bypasses RLS) record purchases, apply refunds and add grants.
--   * One store purchase token = one row, so a purchase can never be owned by two accounts.

create table if not exists public.purchases (
  id               bigint generated always as identity primary key,
  user_id          uuid not null references auth.users (id) on delete restrict,
  store            text not null check (store in ('google_play', 'test')),
  purchase_token   text not null,
  store_product_id text not null,
  product_id       text not null,
  order_id         text,
  state            text not null check (state in ('pending', 'purchased', 'canceled', 'refunded', 'revoked')),
  acknowledged     boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint purchases_token_unique unique (store, purchase_token)
);
create index if not exists purchases_user_idx on public.purchases (user_id);
create index if not exists purchases_unacknowledged_idx on public.purchases (state) where state = 'purchased' and not acknowledged;

create table if not exists public.grants (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  grant_key   text not null check (grant_key ~ '^(pro|guide:[a-z0-9-]+)$'),
  granted_by  uuid not null references auth.users (id),
  reason      text not null check (length(trim(reason)) > 0),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists grants_user_idx on public.grants (user_id) where active;

create table if not exists public.audit_log (
  id      bigint generated always as identity primary key,
  at      timestamptz not null default now(),
  actor   text not null,
  action  text not null,
  target  text not null,
  detail  text
);
create index if not exists audit_log_at_idx on public.audit_log (at desc);

alter table public.purchases enable row level security;
alter table public.grants    enable row level security;
alter table public.audit_log enable row level security;

revoke all on public.purchases, public.grants, public.audit_log from anon, authenticated;
grant select on public.purchases, public.grants to authenticated;

create policy "read own purchases" on public.purchases for select to authenticated using (auth.uid() = user_id);
create policy "read own grants"    on public.grants    for select to authenticated using (auth.uid() = user_id);
-- audit_log: no policies, so only the service role can read or write it.

-- Purchase records are kept when an account is deleted (accounting and fraud prevention; the retention period goes on the
-- Privacy page before launch). Account deletion therefore runs in a server function that detaches them first; the
-- `on delete restrict` above stops an accidental cascade from destroying purchase history.
