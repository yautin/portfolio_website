import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { wagmiConfig } from "./config";

// Lazy boundary for the whole Web3 stack: this module (and everything it pulls
// in — wagmi/viem/react-query) is only imported via dynamic import() when a
// player engages the reward UI, so it never touches the main or /fun bundles.
const queryClient = new QueryClient();

export default function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
