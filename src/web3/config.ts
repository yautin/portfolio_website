import { createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import type { Address } from "viem";

// The network the RewardToken is deployed on. Base mainnet is configured too so
// the connector/network-switch UI can support it, but claims target this chain.
export const REWARD_CHAIN = baseSepolia;

// wagmi config — MetaMask (and other injected wallets) via the injected
// connector. Both Base chains are registered so `useSwitchChain` can offer to
// add/switch to Base Sepolia.
//
// ⚠ CSP: `http()` with no URL resolves to each chain's default public RPC
// (https://sepolia.base.org and https://mainnet.base.org). Those hosts MUST be
// present in `connect-src` in vercel.json or every read — including the balance
// in WalletPanel — is blocked at runtime. If you swap in a private RPC here,
// update that header in the same change.
export const wagmiConfig = createConfig({
  chains: [baseSepolia, base],
  connectors: [injected()],
  transports: {
    [baseSepolia.id]: http(),
    [base.id]: http(),
  },
});

// Feature configuration, read from Vite env at build time. All optional: when
// unset, `rewardsConfigured` is false and the reward UI never renders (zero cost).
export const TOKEN_ADDRESS = import.meta.env.VITE_REWARD_TOKEN_ADDRESS as Address | undefined;

export const FUNCTIONS_URL: string | undefined = (() => {
  const explicit = import.meta.env.VITE_REWARD_FUNCTIONS_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return supabaseUrl ? `${supabaseUrl.replace(/\/$/, "")}/functions/v1` : undefined;
})();

export const rewardsConfigured = Boolean(TOKEN_ADDRESS && FUNCTIONS_URL);

export const TOKEN_META = { name: "Culture Credits", symbol: "CULT", decimals: 18 } as const;

// Block explorer for the reward chain (Base Sepolia).
export const EXPLORER = "https://sepolia.basescan.org";
