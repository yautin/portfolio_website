export interface RewardItem {
  game: string;
  level: string;
}

// The exact human-readable string the player signs to claim a batch of level
// rewards. The server builds it (single source of truth) so the client can't
// sign something other than what `claim-rewards` verifies. Items are sorted
// canonically so the message is order-independent; the wallet address binds the
// signature to that address and the single-use nonce prevents replay.
export function buildBatchMessage(p: { items: RewardItem[]; address: string; nonce: string }): string {
  const sorted = [...p.items].sort((a, b) =>
    `${a.game}:${a.level}`.localeCompare(`${b.game}:${b.level}`)
  );
  return [
    "Culture Credits — reward claim",
    "",
    `Wallet: ${p.address}`,
    `Claiming ${p.items.length} level reward${p.items.length === 1 ? "" : "s"}:`,
    ...sorted.map((it) => `  • ${it.game} — level ${it.level}`),
    `Nonce:  ${p.nonce}`,
    "",
    "Signing proves you control this wallet. It sends no transaction and costs no gas.",
  ].join("\n");
}
