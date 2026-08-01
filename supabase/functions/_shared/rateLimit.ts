import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

// Per-user attempt limit for the reward flow.
//
// Counted against `reward_nonces.created_at` rather than the `token_rewards`
// ledger: the ledger is keyed UNIQUE(user, game, level) and only ever holds one
// row per level (18 total across both games), so it can never reach a
// meaningful hourly threshold — counting it was a no-op guard. Every claim
// requires a freshly-issued nonce, so nonces are the true measure of attempts
// and bound BOTH endpoints.
export const MAX_ATTEMPTS_PER_HOUR = 30;
export const RATE_WINDOW_MS = 3_600_000;

export async function attemptsInLastHour(db: SupabaseClient, userId: string): Promise<number> {
  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const { count } = await db
    .from("reward_nonces")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  return count ?? 0;
}

export async function isRateLimited(db: SupabaseClient, userId: string): Promise<boolean> {
  return (await attemptsInLastHour(db, userId)) >= MAX_ATTEMPTS_PER_HOUR;
}
