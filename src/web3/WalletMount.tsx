import Web3Provider from "./Web3Provider";
import WalletPanel, { type WalletPanelProps } from "./components/WalletPanel";

// Lazy entry for the hub wallet card — the single place claiming happens. Holds
// the wagmi/viem lazy chunk so it never touches the main or /fun initial bundles.
export default function WalletMount(props: WalletPanelProps) {
  return (
    <Web3Provider>
      <WalletPanel {...props} />
    </Web3Provider>
  );
}
