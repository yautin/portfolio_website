import { gameById } from "./games";

// Client-side view of which (game, level) show the reward toast, plus a display
// label.
//
// This file no longer knows any game's levels — it asks the registry, which gets
// them from each game's own facade (`rewardLevels` / `levelLabel`). One
// client-side source of truth per game, inside the game folder where it belongs.
//
// The reward AMOUNT, and an independent copy of which levels are rewardable at
// all, stay server-side in supabase/functions/_shared/rewards.ts. That copy is
// deliberately NOT shared with this one: it is the security boundary and must
// never trust a value that shipped to the browser. This file only decides
// whether to offer the claim UI and what to call the level.

/** @returns {string|null} a human label if (gameId, level) is rewardable, else null */
export function rewardLabel(gameId, level) {
  return gameById(gameId)?.rewardLabel(String(level)) ?? null;
}

// The reward feature is "on" only when both the token address and a functions
// URL (explicit, or derivable from the Supabase URL) are configured at build
// time. Read straight from env so this stays wagmi-free.
export const rewardsEnabled =
  Boolean(import.meta.env.VITE_REWARD_TOKEN_ADDRESS) &&
  Boolean(import.meta.env.VITE_REWARD_FUNCTIONS_URL || import.meta.env.VITE_SUPABASE_URL);
