// POST /functions/v1/claim-rewards
// Verifies a signed BATCH claim and mints the total (1 CULT × the levels not yet
// claimed) to the player's wallet in a single transaction.
//
// ============================ SECURITY MODEL ============================
// Games run 100% client-side, so a "win" can't be cryptographically proven and
// the claimed level list comes from the client. This endpoint doesn't try to
// prove authenticity; it BOUNDS EMISSION so a fake claim is harmless:
//   1. Auth-gated      — requires a valid Supabase JWT.
//   2. Ownership proof — the wallet signs a server-issued single-use nonce over
//                        the exact item list (viem `verifyMessage`). The nonce
//                        is burned with a CONDITIONAL update, so two concurrent
//                        requests can never both consume it.
//   3. Idempotent      — token_rewards is UNIQUE(user_id, game, level): each
//                        level pays out at most once per account, ever. Levels
//                        already `minted` — or `submitted`, i.e. a transaction
//                        for them exists on chain — are skipped from the payout.
//   4. Server amounts  — 1 CULT/level, decided in rewards.ts (never the client).
//   5. Rate limited (per-user attempts, see rateLimit.ts) + on-chain
//      ERC20Capped supply cap.
// The ADMIN_PRIVATE_KEY is a Supabase secret; the admin pays gas.
//
// LEDGER STATUS MACHINE — the rule that prevents double-minting:
//   pending    no transaction was broadcast for this row      → safe to retry
//   failed     broadcast never happened, or the tx reverted    → safe to retry
//   submitted  a tx EXISTS on chain, outcome not yet observed  → NEVER retried
//   minted     receipt confirmed successful                    → never retried
// Rows flip to `submitted` the instant we have a tx hash, before we wait for the
// receipt. So a receipt timeout (or the platform killing this function mid-wait)
// leaves the level un-claimable rather than handing it back to the player and
// minting it a second time when the tx later confirms. Stragglers stuck in
// `submitted` are reconciled out of band from their tx_hash.
// =======================================================================
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getUser, adminDb } from "../_shared/supabase.ts";
import { rewardWei } from "../_shared/rewards.ts";
import { isRateLimited } from "../_shared/rateLimit.ts";
import { safeErrorMessage } from "../_shared/log.ts";
import { buildBatchMessage, type RewardItem } from "../_shared/message.ts";
import { adminClients, tokenAbi, verifyMessage, isAddress } from "../_shared/viem.ts";
import { parseEther, type Hex } from "npm:viem";

const MIN_ADMIN_BALANCE = parseEther("0.0005");
const MAX_ITEMS = 30;
const EXPLORER = "https://sepolia.basescan.org";
// Kept well under the edge runtime's request budget so a slow chain returns a
// clean 202 (rows already `submitted`) instead of the platform killing us.
const RECEIPT_TIMEOUT_MS = 45_000;

// Statuses that mean "a transaction for this level already exists" — these are
// never re-minted.
const SETTLED = new Set(["minted", "submitted"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return jsonResponse(req, { error: "method_not_allowed" }, 405);

  const user = await getUser(req);
  if (!user) return jsonResponse(req, { error: "unauthorized" }, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return jsonResponse(req, { error: "bad_json" }, 400); }
  const address = String(body.address ?? "");
  const nonce = String(body.nonce ?? "");
  const signature = String(body.signature ?? "");
  const items = ((Array.isArray(body.items) ? body.items : []) as RewardItem[])
    .map((it) => ({ game: String(it?.game), level: String(it?.level) }));

  if (!isAddress(address)) return jsonResponse(req, { error: "invalid_address" }, 400);
  if (items.length === 0 || items.length > MAX_ITEMS) return jsonResponse(req, { error: "bad_items" }, 400);
  if (!nonce || !signature) return jsonResponse(req, { error: "missing_fields" }, 400);
  for (const it of items) {
    if (rewardWei(it.game, it.level) === null) return jsonResponse(req, { error: "not_rewardable" }, 400);
  }

  const db = adminDb();

  // 1) Per-user attempt limit (counted on issued nonces — see rateLimit.ts).
  if (await isRateLimited(db, user.id)) return jsonResponse(req, { error: "rate_limited" }, 429);

  // 2) Nonce must exist for THIS user, be unused & unexpired. Cheap precheck so
  //    the client gets a precise error; the authoritative gate is the
  //    conditional burn in step 4.
  const { data: nrow } = await db
    .from("reward_nonces").select("used, expires_at")
    .eq("nonce", nonce).eq("user_id", user.id).maybeSingle();
  if (!nrow || nrow.used || new Date(nrow.expires_at) < new Date()) {
    return jsonResponse(req, { error: "invalid_nonce" }, 400);
  }

  // 3) Signature must recover to `address` over the exact item list. Checked
  //    before the burn so a transient signing failure doesn't cost a nonce.
  const message = buildBatchMessage({ items, address, nonce });
  let sigOk = false;
  try { sigOk = await verifyMessage({ address: address as Hex, message, signature: signature as Hex }); } catch { sigOk = false; }
  if (!sigOk) return jsonResponse(req, { error: "bad_signature" }, 401);

  // 4) Burn the nonce ATOMICALLY. The `used = false` predicate makes this a
  //    compare-and-swap: of two concurrent requests carrying the same nonce,
  //    exactly one gets a row back and proceeds — the other bails out here,
  //    before it can reach the mint.
  const { data: burned, error: burnErr } = await db
    .from("reward_nonces")
    .update({ used: true })
    .eq("nonce", nonce)
    .eq("user_id", user.id)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .select("nonce");
  if (burnErr) return jsonResponse(req, { error: "ledger_error" }, 500);
  if (!burned || burned.length === 0) return jsonResponse(req, { error: "invalid_nonce" }, 400);

  // 5) Idempotently own each level's row. minted/submitted → skip (a tx already
  //    exists); missing/failed/pending → (re)set pending and include in the payout.
  const payout: RewardItem[] = [];
  let totalWei = 0n;
  for (const it of items) {
    const wei = rewardWei(it.game, it.level)!;
    const match = { user_id: user.id, game: it.game, level: it.level };
    const ins = await db.from("token_rewards").insert({ ...match, wallet: address, amount: wei.toString(), status: "pending" });
    if (ins.error) {
      if (ins.error.code !== "23505") return jsonResponse(req, { error: "ledger_error" }, 500);
      const { data: ex } = await db.from("token_rewards").select("status").match(match).maybeSingle();
      if (ex && SETTLED.has(ex.status)) continue; // already claimed / in flight
      await db.from("token_rewards").update({ status: "pending", wallet: address }).match(match);
    }
    payout.push(it);
    totalWei += wei;
  }
  if (payout.length === 0) return jsonResponse(req, { error: "already_claimed", count: 0 }, 409);

  const markAll = async (status: "submitted" | "minted" | "failed", txHash?: Hex) => {
    for (const it of payout) {
      await db.from("token_rewards")
        .update({ status, tx_hash: txHash ?? null })
        .match({ user_id: user.id, game: it.game, level: it.level });
    }
  };

  // 6) Mint the whole batch in one transaction (admin pays gas).
  //
  // adminClients() is guarded on its own: it calls requireEnv() and
  // privateKeyToAccount(), either of which throws on a missing or malformed
  // secret. Unguarded, that throw escaped the handler entirely and the caller got
  // a raw non-JSON 500 — which the client could only report as an opaque
  // "http_500", with nothing to indicate a secret was at fault.
  let clients: ReturnType<typeof adminClients>;
  try {
    clients = adminClients();
  } catch (err) {
    await markAll("failed");
    console.error("admin client init failed (check ADMIN_PRIVATE_KEY / BASE_SEPOLIA_RPC_URL / REWARD_TOKEN_ADDRESS):", safeErrorMessage(err));
    return jsonResponse(req, { error: "reward_service_unavailable" }, 503);
  }
  const { account, wallet, pub, token } = clients;

  let txHash: Hex;
  try {
    const balance = await pub.getBalance({ address: account.address });
    if (balance < MIN_ADMIN_BALANCE) {
      await markAll("failed");
      return jsonResponse(req, { error: "reward_service_unavailable" }, 503); // admin out of gas
    }
    txHash = await wallet.writeContract({ address: token, abi: tokenAbi, functionName: "mint", args: [address as Hex, totalWei] });
  } catch (err) {
    // Broadcast never completed → no transaction to double-spend. Safe to retry.
    await markAll("failed");
    console.error("mint submit failed:", safeErrorMessage(err));
    return jsonResponse(req, { error: "mint_failed" }, 502);
  }

  // From here a transaction EXISTS on chain. Record that BEFORE waiting for the
  // receipt, so no failure path below can hand these levels back to the player.
  await markAll("submitted", txHash);

  const explorerUrl = `${EXPLORER}/tx/${txHash}`;
  try {
    const receipt = await pub.waitForTransactionReceipt({ hash: txHash, timeout: RECEIPT_TIMEOUT_MS });
    if (receipt.status !== "success") {
      // Final and minted nothing (e.g. cap exceeded) → genuinely safe to retry.
      await markAll("failed", txHash);
      return jsonResponse(req, { error: "mint_reverted", txHash, explorerUrl }, 502);
    }
  } catch (err) {
    // Timed out or the RPC hiccuped. Rows stay `submitted`: the tx will almost
    // certainly confirm, so the reward must NOT be offered again.
    console.error("receipt wait failed:", safeErrorMessage(err));
    return jsonResponse(req, {
      status: "submitted",
      txHash,
      count: payout.length,
      amount: totalWei.toString(),
      explorerUrl,
    }, 202);
  }

  await markAll("minted", txHash);
  return jsonResponse(req, {
    status: "minted",
    txHash,
    count: payout.length,
    amount: totalWei.toString(),
    explorerUrl,
  });
});
