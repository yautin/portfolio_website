import { erc20Abi, formatUnits } from "viem";
import type { Address } from "viem";
import { useAccount, useConnect, useDisconnect, useReadContract, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";
import { EXPLORER, REWARD_CHAIN, TOKEN_ADDRESS, TOKEN_META } from "../config";
import { watchRewardToken } from "../watchAsset";
import { useBatchClaim } from "../hooks/useBatchClaim";
import type { RewardItem } from "../types";

const truncate = (a: Address) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const hasInjectedWallet = () => typeof window !== "undefined" && "ethereum" in window;

export interface WalletPanelProps {
  isSignedIn: boolean;
  /** Levels the player has beaten but not yet minted (from FunPage). */
  claimable: RewardItem[];
  getAccessToken: () => Promise<string | null>;
  /** Called after a successful claim so FunPage can refresh the claimable set. */
  onClaimed: () => void;
}

// Persistent "Rewards wallet" card: connect MetaMask, see the $CULT balance, and
// batch-claim every beaten-but-unclaimed level in one tx.
export default function WalletPanel({ isSignedIn, claimable, getAccessToken, onClaimed }: WalletPanelProps) {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const balance = useReadContract({
    address: TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: REWARD_CHAIN.id,
    query: { enabled: Boolean(address && TOKEN_ADDRESS) },
  });

  const claimer = useBatchClaim({
    items: claimable,
    getAccessToken,
    onClaimed: () => { balance.refetch(); onClaimed(); },
  });

  const balanceText =
    balance.data !== undefined ? `${formatUnits(balance.data, TOKEN_META.decimals)} $${TOKEN_META.symbol}`
    : balance.isLoading ? "…"
    : `— $${TOKEN_META.symbol}`;

  const wrongNetwork = isConnected && chainId !== REWARD_CHAIN.id;
  const connector = connectors.find((c) => c.id === "injected") ?? injected();
  const n = claimable.length;
  const busy = claimer.status === "connecting" || claimer.status === "signing" || claimer.status === "minting";
  const busyLabel = claimer.status === "connecting" ? "Connecting…" : claimer.status === "signing" ? "Waiting for signature…" : "Minting…";

  return (
    <div className="reward-wallet">
      <h3 className="reward-wallet-title">🪙 Rewards wallet</h3>

      {!hasInjectedWallet() ? (
        <>
          <p className="reward-wallet-note">Install MetaMask to hold your ${TOKEN_META.symbol} rewards.</p>
          <a className="reward-btn is-primary" href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">Install MetaMask</a>
        </>
      ) : !isConnected || !address ? (
        <>
          <p className="reward-wallet-note">
            {n > 0 ? `You have ${n} unclaimed reward${n === 1 ? "" : "s"}. ` : ""}
            Connect to view your ${TOKEN_META.symbol} balance on {REWARD_CHAIN.name}.
          </p>
          <button type="button" className="reward-btn is-primary" disabled={isPending} onClick={() => connect({ connector })}>
            {isPending ? "Connecting…" : "Connect MetaMask"}
          </button>
        </>
      ) : (
        <>
          <div className="reward-wallet-row">
            <span className="reward-wallet-addr" title={address}>{truncate(address)}</span>
            <button type="button" className="reward-link" onClick={() => disconnect()}>Disconnect</button>
          </div>
          <div className="reward-wallet-balance">
            <span className="reward-wallet-amount">{balanceText}</span>
          </div>

          {claimer.status === "success" && claimer.result ? (
            <p className="reward-wallet-sub">
              {claimer.result.status === "submitted"
                ? `⏳ ${claimer.result.count} reward${claimer.result.count === 1 ? "" : "s"} sent — confirming on chain. `
                : `✓ Claimed ${claimer.result.count} reward${claimer.result.count === 1 ? "" : "s"}! `}
              <a className="reward-link" href={claimer.result.explorerUrl} target="_blank" rel="noopener noreferrer">BaseScan ↗</a>
            </p>
          ) : !isSignedIn ? null : n > 0 ? (
            <>
              {claimer.error && <p className="reward-error">{claimer.error}</p>}
              <button type="button" className="reward-btn is-primary" disabled={busy} onClick={claimer.claim}>
                {busy ? busyLabel : `Claim ${n} reward${n === 1 ? "" : "s"} (${n} $${TOKEN_META.symbol})`}
              </button>
            </>
          ) : (
            <p className="reward-wallet-sub">All rewards claimed ✓ — beat a new level to earn more.</p>
          )}

          {wrongNetwork && (
            <p className="reward-wallet-note">
              Rewards live on {REWARD_CHAIN.name}.{" "}
              <button type="button" className="reward-link" onClick={() => switchChain({ chainId: REWARD_CHAIN.id })}>Switch network</button>{" "}
              to view the token.
            </p>
          )}
          <div className="reward-wallet-actions">
            <button type="button" className="reward-btn is-ghost" onClick={watchRewardToken}>Add ${TOKEN_META.symbol}</button>
            <a className="reward-btn is-ghost" href={`${EXPLORER}/token/${TOKEN_ADDRESS}?a=${address}`} target="_blank" rel="noopener noreferrer">BaseScan ↗</a>
          </div>
        </>
      )}

      {!isSignedIn && (
        <p className="reward-wallet-signin">🔒 Sign in to your account to claim rewards.</p>
      )}
    </div>
  );
}
