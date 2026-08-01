import type { Hex } from "viem";

export interface RewardItem {
  game: string;
  level: string;
}

export interface NonceResponse {
  nonce: string;
  message: string;
  expiresAt: string;
}

export interface ClaimResponse {
  txHash: Hex;
  count: number;
  amount: string; // wei
  explorerUrl: string;
  /**
   * `minted` — the receipt confirmed successfully.
   * `submitted` (HTTP 202) — the transaction is on chain but the server stopped
   * waiting for its receipt. The rewards are already spent server-side and will
   * not be offered again, so the UI reports "confirming" rather than an error.
   */
  status?: "minted" | "submitted";
}

/** Error codes returned by the edge functions (see supabase/functions/*). */
export interface ApiError {
  error: string;
  count?: number;
  txHash?: string;
}

export type ClaimStatus =
  | "idle"
  | "connecting"
  | "signing"
  | "minting"
  | "success"
  | "error";
