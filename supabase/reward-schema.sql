-- Web3 token-reward easter egg — ledger + signing nonces.
-- Run once in the Supabase SQL editor (after schema.sql). Safe to re-run.
--
-- SECURITY: both tables are written ONLY by the edge functions using the
-- service-role key (which bypasses RLS). The `authenticated` role gets read
-- access to its own reward rows and NO access to nonces. This ledger is the
-- off-chain emission cap: `unique (user_id, game, level)` means each level pays
-- out at most once per account, so a spoofed client win can never mint more
-- than a single account's finite, capped, valueless testnet allotment.

-- ---- claim ledger --------------------------------------------------------
-- status machine (enforced in claim-rewards/index.ts):
--   pending    no tx broadcast for this row      -> safe to retry
--   failed     broadcast never happened, or the tx reverted -> safe to retry
--   submitted  a tx EXISTS on chain, outcome unobserved     -> NEVER retried
--   minted     receipt confirmed successful                 -> never retried
-- `submitted` is what closes the double-mint window: rows flip to it the moment
-- a tx hash exists, so a receipt timeout can't hand the level back to the player.
create table if not exists public.token_rewards (
  user_id    uuid  not null references auth.users (id) on delete cascade,
  game       text  not null,
  level      text  not null,               -- difficulty key or level number
  wallet     text  not null,               -- recipient (proven via signature)
  amount     numeric(78, 0) not null,      -- token amount in wei (uint256 range)
  status     text  not null default 'pending'
             check (status in ('pending', 'submitted', 'minted', 'failed')),
  tx_hash    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, game, level)       -- idempotency: one reward per level
);

-- Widen the status check on deployments created before `submitted` existed.
-- (`create table if not exists` above is a no-op once the table is there.)
do $$
begin
  alter table public.token_rewards drop constraint if exists token_rewards_status_check;
  alter table public.token_rewards add constraint token_rewards_status_check
    check (status in ('pending', 'submitted', 'minted', 'failed'));
end $$;

alter table public.token_rewards enable row level security;

-- Signed-in users may READ their own reward rows (to show claim history). All
-- writes go through the service role in the edge function, so there is
-- deliberately NO insert/update/delete policy for `authenticated`.
grant select on public.token_rewards to authenticated;

drop policy if exists "read own rewards" on public.token_rewards;
create policy "read own rewards"
  on public.token_rewards for select
  to authenticated
  using (auth.uid() = user_id);

drop trigger if exists token_rewards_touch on public.token_rewards;
create trigger token_rewards_touch
  before update on public.token_rewards
  for each row execute function public.touch_updated_at();  -- defined in schema.sql

-- ---- single-use signing nonces ------------------------------------------
create table if not exists public.reward_nonces (
  nonce      text  primary key,
  user_id    uuid  not null references auth.users (id) on delete cascade,
  game       text  not null,
  level      text  not null,
  used       boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- RLS on with NO policies => the `authenticated` role cannot touch this table at
-- all. Only the service-role edge function reads/writes it.
alter table public.reward_nonces enable row level security;

create index if not exists reward_nonces_expiry_idx on public.reward_nonces (expires_at);

-- Backs the per-user attempt rate limit (_shared/rateLimit.ts counts rows in
-- this table over the last hour — nonces are the only true measure of claim
-- attempts, since the ledger holds at most one row per level).
create index if not exists reward_nonces_user_created_idx
  on public.reward_nonces (user_id, created_at desc);

-- Housekeeping. reward-nonce already sweeps each caller's rows older than the
-- rate window on every request, so this is optional belt-and-braces for scale.
-- Enable pg_cron in Dashboard -> Database -> Extensions first; the guard keeps
-- this file runnable either way.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'reward-nonces-sweep',
      '17 * * * *',
      $sweep$delete from public.reward_nonces where created_at < now() - interval '1 hour'$sweep$
    );
  end if;
end $$;
