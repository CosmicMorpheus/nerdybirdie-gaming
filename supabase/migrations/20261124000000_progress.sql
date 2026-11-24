-- Nerdy Birdie Gaming: one progress document per signed-in player.
-- Privacy is enforced HERE (row-level security), not in the browser: a player can only read and write their own row.

create table if not exists public.progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  version    integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  constraint progress_size check (octet_length(data::text) < 1000000)
);

alter table public.progress enable row level security;

-- Signed-out visitors get nothing.
revoke all on public.progress from anon;
grant select, insert, update, delete on public.progress to authenticated;

create policy "read own progress"   on public.progress for select to authenticated using (auth.uid() = user_id);
create policy "insert own progress" on public.progress for insert to authenticated with check (auth.uid() = user_id);
create policy "update own progress" on public.progress for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own progress" on public.progress for delete to authenticated using (auth.uid() = user_id);
