import { useCallback, useState } from "react";
import { useAccount, useChainId, useConnect, useSignMessage, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";
import type { Address } from "viem";
import { REWARD_CHAIN } from "../config";
import { claimRewards, requestNonce, RewardApiError } from "../api";
import type { ClaimResponse, ClaimStatus, RewardItem } from "../types";

// Friendly copy for every failure path.
const MESSAGES: Record<string, string> = {
  no_wallet: "No wallet found. Install MetaMask to claim.",
  not_signed_in: "Sign in to your account first, then claim.",
  connect_rejected: "Wallet connection was cancelled.",
  sign_rejected: "Signature request was rejected.",
  already_claimed: "These rewards are already claimed.",
  rate_limited: "Too many claims for now — try again shortly.",
  reward_service_unavailable: "The reward service is temporarily unavailable. Please try again later.",
  not_rewardable: "One of those levels isn't rewardable.",
  bad_items: "Nothing to claim.",
  invalid_nonce: "Your claim expired — please try again.",
  bad_signature: "Signature didn't match your wallet — please try again.",
  mint_failed: "The reward transaction failed. Please try again.",
  mint_reverted: "The reward transaction was rejected on chain. Please try again.",
  network_error: "Network error reaching the reward service.",
  not_configured: "Rewards aren't configured on this deployment.",
};

function messageFor(err: unknown): string {
  if (err instanceof RewardApiError) return MESSAGES[err.code] ?? "Something went wrong claiming your rewards.";
  if (err instanceof Error) {
    if (/user rejected|denied|rejected the request/i.test(err.message)) return MESSAGES.sign_rejected;
    if (err.message in MESSAGES) return MESSAGES[err.message];
  }
  return "Something went wrong claiming your rewards.";
}

const hasInjectedWallet = () => typeof window !== "undefined" && "ethereum" in window;

export interface UseBatchClaim {
  items: RewardItem[];
  getAccessToken: () => Promise<string | null>;
  onClaimed?: () => void;
}

// Claims a batch of level rewards: connect (injected) → server nonce over the
// item list → wallet signature (ownership proof) → backend mints the total in
// one tx. A single win is just a one-item batch.
export function useBatchClaim({ items, getAccessToken, onClaimed }: UseBatchClaim) {
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { signMessageAsync } = useSignMessage();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  const [status, setStatus] = useState<ClaimStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClaimResponse | null>(null);

  const onWrongNetwork = isConnected && chainId !== REWARD_CHAIN.id;
  const switchNetwork = useCallback(async () => {
    try { await switchChainAsync({ chainId: REWARD_CHAIN.id }); } catch { /* declined */ }
  }, [switchChainAsync]);

  const claim = useCallback(async () => {
    setError(null);
    setResult(null);
    try {
      if (!hasInjectedWallet()) throw new RewardApiError("no_wallet");
      if (items.length === 0) throw new RewardApiError("bad_items");

      let addr = address as Address | undefined;
      if (!isConnected || !addr) {
        setStatus("connecting");
        const connector = connectors.find((c) => c.id === "injected") ?? injected();
        try {
          const res = await connectAsync({ connector });
          addr = res.accounts[0];
        } catch {
          throw new RewardApiError("connect_rejected");
        }
      }
      if (!addr) throw new RewardApiError("no_wallet");

      const token = await getAccessToken();
      if (!token) throw new RewardApiError("not_signed_in");

      setStatus("signing");
      const { nonce, message } = await requestNonce(token, items, addr);
      const signature = await signMessageAsync({ message });

      setStatus("minting");
      const res = await claimRewards(token, items, addr, nonce, signature);
      setResult(res);
      setStatus("success");
      onClaimed?.();
    } catch (err) {
      setError(messageFor(err));
      setStatus("error");
    }
  }, [address, isConnected, connectors, connectAsync, getAccessToken, items, signMessageAsync, onClaimed]);

  return {
    status,
    error,
    result,
    claim,
    address: address as Address | undefined,
    isConnected,
    onWrongNetwork,
    switchNetwork,
    hasWallet: hasInjectedWallet(),
  };
}
