import { FUNCTIONS_URL } from "./config";
import type { ApiError, ClaimResponse, NonceResponse, RewardItem } from "./types";
import type { Address, Hex } from "viem";

// Thin, typed client for the reward edge functions. The Supabase access token is
// passed in (not imported) so this TS module stays decoupled from the JS app.
// Claims are batched: a single win is just a one-item batch.

class RewardApiError extends Error {
  constructor(public code: string, public txHash?: string) {
    super(code);
    this.name = "RewardApiError";
  }
}

async function post<T>(path: string, token: string, body: unknown): Promise<T> {
  if (!FUNCTIONS_URL) throw new RewardApiError("not_configured");
  let res: Response;
  try {
    res = await fetch(`${FUNCTIONS_URL}/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new RewardApiError("network_error");
  }
  const data = (await res.json().catch(() => ({}))) as Partial<T & ApiError>;
  if (!res.ok) throw new RewardApiError(data.error ?? `http_${res.status}`, data.txHash);
  return data as T;
}

export function requestNonce(token: string, items: RewardItem[], address: Address): Promise<NonceResponse> {
  return post<NonceResponse>("reward-nonce", token, { items, address });
}

export function claimRewards(token: string, items: RewardItem[], address: Address, nonce: string, signature: Hex): Promise<ClaimResponse> {
  return post<ClaimResponse>("claim-rewards", token, { items, address, nonce, signature });
}

export { RewardApiError };
