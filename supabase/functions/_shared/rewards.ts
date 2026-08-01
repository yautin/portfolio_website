// SERVER-AUTHORITATIVE reward schedule. The client only ever names a (game,
// level); the amount is decided HERE so a tampered client can't inflate its
// payout. Returns the reward in wei (18 decimals), or null if that (game, level)
// is not rewardable (which callers reject).
//
// Policy: a flat 1 CULT per level, minted at most once per (account, level) —
// the per-account cap is enforced by the token_rewards UNIQUE(user, game, level)
// constraint, not here.
const UNIT = 10n ** 18n;
const REWARD = 1n * UNIT; // 1 CULT per level

const MICROWELL_LEVELS = new Set(["easy", "normal", "hard"]);

export function rewardWei(game: string, level: string): bigint | null {
  if (game === "microwell") return MICROWELL_LEVELS.has(level) ? REWARD : null;
  if (game === "immune-defense") {
    const n = Number(level);
    return Number.isInteger(n) && n >= 1 && n <= 15 ? REWARD : null;
  }
  return null;
}

// Human-readable token amount for UIs/logs (integer tokens; rewards are whole).
export function toTokens(wei: bigint): string {
  return (wei / UNIT).toString();
}
