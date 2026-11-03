-- Apply this file as the database owner before enabling cloud-backed login.
-- Additive and repeatable: only these portfolio-specific objects are touched.
-- RPC contract: portfolio_check_rate_limit(p_ip_hash text) -> integer seconds.
-- 0 reserves an attempt; 1..900 denies it. Successful logins also consume quota.
-- Hashes are server-generated, domain-separated HMAC-SHA256, never raw IPs.
begin;

create table if not exists public.portfolio_login_rate_limits (
  ip_hash text primary key check (ip_hash ~ '^[0-9a-f]{64}$'),
  attempts smallint not null check (attempts between 1 and 11),
  expires_at timestamp with time zone not null
);

create index if not exists portfolio_login_rate_limits_expiry_idx
  on public.portfolio_login_rate_limits (expires_at);

alter table public.portfolio_login_rate_limits enable row level security;
-- The service role uses only the definer function, not direct table access.
revoke all on table public.portfolio_login_rate_limits from public, anon, authenticated, service_role;

create or replace function public.portfolio_check_rate_limit(p_ip_hash text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamp with time zone := pg_catalog.clock_timestamp();
  v_attempts smallint;
  v_expires timestamp with time zone;
begin
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid rate-limit hash' using errcode = '22023';
  end if;

  -- Cleanup is transactional and uses only the database clock. No raw IP data.
  delete from public.portfolio_login_rate_limits where expires_at <= v_now;

  -- The conflicting row lock serializes reservations across all API instances.
  -- Saturate denied attempts at 11 to avoid overflow under sustained traffic.
  insert into public.portfolio_login_rate_limits as limits (ip_hash, attempts, expires_at)
  values (p_ip_hash, 1, v_now + interval '15 minutes')
  on conflict (ip_hash) do update
  set attempts = case when limits.expires_at <= v_now then 1
      else least(limits.attempts + 1, 11) end,
    expires_at = case when limits.expires_at <= v_now then v_now + interval '15 minutes'
      else limits.expires_at end
  returning attempts, expires_at into v_attempts, v_expires;

  if v_attempts <= 10 then
    return 0;
  end if;
  return greatest(1, least(900,
    pg_catalog.ceil(extract(epoch from (v_expires - pg_catalog.clock_timestamp())))::integer));
end;
$$;

-- Revoke defaults explicitly and atomically with creation, not schema-wide.
revoke all on function public.portfolio_check_rate_limit(text) from public, anon, authenticated;
grant execute on function public.portfolio_check_rate_limit(text) to service_role;

commit;
