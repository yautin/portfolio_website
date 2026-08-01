import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { allBeatenLevels } from "../games";
import { rewardsEnabled } from "../rewards";

// Which (game, level) rewards the player can still claim.
//
//   claimable = levels beaten locally  −  levels already minted for this account
//
// The minted set comes from the RLS-scoped `token_rewards` ledger (the query
// needs no user filter — the policy restricts it to the caller's own rows).
// Beaten levels are read fresh from saved progress on every render, so a win
// that just landed shows up without any extra plumbing.
//
// Signed out, everything beaten is reported as claimable: the wallet panel then
// prompts for sign-in rather than pretending there's nothing to collect.
//
// @param tick bump to re-read after a claim or a progress reset.
export function useClaimable(session, tick) {
  const [claimedKeys, setClaimedKeys] = useState(() => new Set());

  useEffect(() => {
    if (!rewardsEnabled || !session || !supabase) return;
    let cancelled = false;
    supabase
      .from("token_rewards")
      .select("game,level")
      .eq("status", "minted")
      .then(({ data }) => {
        if (!cancelled) setClaimedKeys(new Set((data ?? []).map((r) => `${r.game}:${r.level}`)));
      }, () => {});
    return () => { cancelled = true; };
  }, [session, tick]);

  const beaten = rewardsEnabled ? allBeatenLevels() : [];
  return session ? beaten.filter((b) => !claimedKeys.has(`${b.game}:${b.level}`)) : beaten;
}
