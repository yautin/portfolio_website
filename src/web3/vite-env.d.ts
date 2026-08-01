/// <reference types="vite/client" />

// Reward-feature env vars (all optional — the feature stays hidden when unset).
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_REWARD_TOKEN_ADDRESS?: string;
  /** Override for the edge-function base URL; defaults to `${VITE_SUPABASE_URL}/functions/v1`. */
  readonly VITE_REWARD_FUNCTIONS_URL?: string;
}

// Minimal injected-wallet (MetaMask) surface we touch directly.
interface Window {
  ethereum?: {
    request(args: { method: string; params?: unknown }): Promise<unknown>;
  };
}
