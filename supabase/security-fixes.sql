-- Supabase security-advisor remediations that do NOT belong to a table schema.
-- Run once in the Dashboard → SQL Editor → New query. Safe to re-run (idempotent).
--
-- `public.touch_updated_at()` used to be re-declared here as well. It isn't any
-- more: schema.sql is its single source of truth (SECURITY INVOKER + EXECUTE
-- revoked from anon/authenticated), and keeping a second copy meant two
-- definitions that could silently drift. Running schema.sql clears that advisor.
--
-- What's left here:
--   • anon/authenticated_security_definer_function_executable  (rls_auto_enable)
--   • auth_leaked_password_protection  (a Dashboard setting — see the bottom)

-- ────────────────────────────────────────────────────────────────────────────
-- 1) public.rls_auto_enable()  — NOT created by this project. It looks like a
--    helper (likely an event-trigger function that auto-enables RLS on new
--    tables). VERIFY what it does before dropping it. Revoking EXECUTE clears the
--    advisor without removing the function, and is safe even if it backs an event
--    trigger (event triggers, like row triggers, don't check EXECUTE grants).
--    Guarded so this file runs cleanly whether or not the function exists.
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'rls_auto_enable'
      and p.pronargs = 0
  ) then
    execute 'revoke execute on function public.rls_auto_enable() from anon, authenticated, public';
  end if;
end $$;

-- If you confirm rls_auto_enable() is unused, remove it instead of the revoke:
--   drop function if exists public.rls_auto_enable();
-- (Fails if an event trigger still depends on it — drop that event trigger first.)

-- ────────────────────────────────────────────────────────────────────────────
-- 2) Leaked Password Protection — an Auth SETTING, not SQL. Enable it here:
--    Dashboard → Authentication → Sign In / Providers → Password → toggle on
--    "Prevent use of leaked passwords" (checks passwords against HaveIBeenPwned).
--    Nothing to run for this one.
