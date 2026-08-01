import { TOKEN_ADDRESS, TOKEN_META } from "./config";

// Prompt the connected wallet to track the reward token (EIP-747 wallet_watchAsset).
// No-op if the feature is unconfigured, there's no injected wallet, or the user
// declines. Shared by the reward toast and the hub wallet panel.
export async function watchRewardToken(): Promise<void> {
  if (!TOKEN_ADDRESS || !window.ethereum) return;
  try {
    await window.ethereum.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: { address: TOKEN_ADDRESS, symbol: TOKEN_META.symbol, decimals: TOKEN_META.decimals },
      },
    });
  } catch {
    /* user declined — ignore */
  }
}
