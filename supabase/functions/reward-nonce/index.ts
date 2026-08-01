// POST /functions/v1/reward-nonce
// Issues a single-use, short-lived challenge for a BATCH of (game, level)
// rewards the player wants to claim. Requires a valid Supabase JWT. The returned
// `message` is what the client must sign verbatim.
//
// This endpoint is the throttle for the whole reward flow: a claim is only
// possible with a freshly-issued nonce, so capping issuance here caps claims.
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getUser, adminDb } from "../_shared/supabase.ts";
import { rewardWei } from "../_shared/rewards.ts";
import { isRateLimited, RATE_WINDOW_MS } from "../_shared/rateLimit.ts";
import { safeErrorMessage } from "../_shared/log.ts";
import { buildBatchMessage, type RewardItem } from "../_shared/message.ts";
import { isAddress } from "../_shared/viem.ts";

const NONCE_TTL_MS = 5 * 60 * 1000;
const MAX_ITEMS = 30;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return jsonResponse(req, { error: "method_not_allowed" }, 405);

  const user = await getUser(req);
  if (!user) return jsonResponse(req, { error: "unauthorized" }, 401);

  let body: { items?: unknown; address?: unknown };
  try { body = await req.json(); } catch { return jsonResponse(req, { error: "bad_json" }, 400); }

  const address = String(body.address ?? "");
  const items = (Array.isArray(body.items) ? body.items : []) as RewardItem[];

  if (!isAddress(address)) return jsonResponse(req, { error: "invalid_address" }, 400);
  if (items.length === 0 || items.length > MAX_ITEMS) return jsonResponse(req, { error: "bad_items" }, 400);
  for (const it of items) {
    if (!it || rewardWei(String(it.game), String(it.level)) === null) {
      return jsonResponse(req, { error: "not_rewardable" }, 400);
    }
  }

  const db = adminDb();

  // Per-user attempt cap. Without this, any signed-in account could loop this
  // endpoint and grow reward_nonces without bound.
  if (await isRateLimited(db, user.id)) return jsonResponse(req, { error: "rate_limited" }, 429);

  // Opportunistic housekeeping: drop this user's nonces older than the rate
  // window. Keeps the table self-trimming with no cron/extension dependency (a
  // scheduled sweep is still worth it at scale — see reward-schema.sql).
  // NOTE the cutoff is the rate window, NOT `expires_at`: sweeping merely-expired
  // rows (TTL 5 min) would erase the very rows isRateLimited counts and hand the
  // caller a fresh quota every five minutes.
  const { error: sweepErr } = await db
    .from("reward_nonces").delete()
    .eq("user_id", user.id)
    .lt("created_at", new Date(Date.now() - RATE_WINDOW_MS).toISOString());
  if (sweepErr) console.warn("nonce sweep:", safeErrorMessage(sweepErr));

  // 256 bits of randomness. The batch nonce isn't tied to a single level, so the
  // (not-null) game/level columns get a placeholder.
  const nonce = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS).toISOString();

  const { error } = await db
    .from("reward_nonces")
    .insert({ nonce, user_id: user.id, game: "*", level: "*", expires_at: expiresAt });
  if (error) return jsonResponse(req, { error: "nonce_store_failed" }, 500);

  return jsonResponse(req, {
    nonce,
    message: buildBatchMessage({ items: items.map((it) => ({ game: String(it.game), level: String(it.level) })), address, nonce }),
    expiresAt,
  });
});
