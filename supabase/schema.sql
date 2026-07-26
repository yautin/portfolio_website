-- Immune Defense (and future games) cloud saves.
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).

create table if not exists public.game_saves (
  user_id    uuid not null references auth.users (id) on delete cascade,
  game_id    text not null,
  save_data  jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id),
  -- keep save blobs small; a full Immune Defense save is well under 1 KB
  constraint save_data_size check (pg_column_size(save_data) < 16384)
);

alter table public.game_saves enable row level security;

-- Base table privileges for signed-in users. RLS (below) still restricts every
-- row to its owner; this GRANT is what lets the `authenticated` role reach the
-- table at all. Granted explicitly rather than relying on Supabase's implicit
-- default privileges, so the schema is self-contained and portable.
grant select, insert, update, delete on public.game_saves to authenticated;

-- Users can only ever read / write / delete their own saves.
-- (drop-then-create so the whole file is safe to re-run.)
drop policy if exists "read own saves" on public.game_saves;
create policy "read own saves"
  on public.game_saves for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "insert own saves" on public.game_saves;
create policy "insert own saves"
  on public.game_saves for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "update own saves" on public.game_saves;
create policy "update own saves"
  on public.game_saves for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "delete own saves" on public.game_saves;
create policy "delete own saves"
  on public.game_saves for delete
  to authenticated
  using (auth.uid() = user_id);

-- keep updated_at fresh on every save
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists game_saves_touch on public.game_saves;
create trigger game_saves_touch
  before update on public.game_saves
  for each row execute function public.touch_updated_at();
