import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  isAddress,
  verifyMessage,
  type Hex,
} from "npm:viem";
import { privateKeyToAccount } from "npm:viem/accounts";
import { baseSepolia } from "npm:viem/chains";
import { requireEnv } from "./env.ts";

export { isAddress, verifyMessage };

// Minimal ABI — only what the edge function calls.
export const tokenAbi = parseAbi([
  "function mint(address to, uint256 amount) external",
  "function balanceOf(address account) view returns (uint256)",
  "function owner() view returns (address)",
]);

/// Build the admin (owner/minter) clients from secrets. The ADMIN_PRIVATE_KEY is
/// the sole key allowed to mint — it lives only in Supabase secrets, never in
/// the client bundle or the repo. The admin pays gas, so players need no ETH.
export function adminClients() {
  const raw = requireEnv("ADMIN_PRIVATE_KEY");
  const pk = (raw.startsWith("0x") ? raw : `0x${raw}`) as Hex;
  const account = privateKeyToAccount(pk);
  const transport = http(requireEnv("BASE_SEPOLIA_RPC_URL"));
  return {
    account,
    wallet: createWalletClient({ account, chain: baseSepolia, transport }),
    pub: createPublicClient({ chain: baseSepolia, transport }),
    token: requireEnv("REWARD_TOKEN_ADDRESS") as Hex,
  };
}
