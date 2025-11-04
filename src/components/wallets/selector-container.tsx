'use client';
import * as React from 'react';
import WalletSelector, {DetectedWallet} from './selector';
import {useWalletStore, walletEvents} from '@/store/wallet-store';
import { WALLET_METADATA_BY_RDNS} from "@/utils/wallet-metadata";
import {eip6963Store} from "@/utils/eip6963-provider";
import { connect, switchChain, getAccount } from '@wagmi/core';
import { wagmiConfig} from "@/lib/wagmi/config";
import { walletConnectForQR} from "@/lib/wagmi/walletconnect";

export function buildDetectedWallets(availableWallets: Array<{ name: string, rdns: string, icon?: string}>): DetectedWallet[] {
  const out: DetectedWallet[] = [];
  for (const wallet of availableWallets) {
    const meta = WALLET_METADATA_BY_RDNS[wallet.rdns];
    if (!meta) continue;
    out.push({
      id: wallet.rdns,
      name: meta.name ?? wallet.name,
      description: "Detected in your browser",
      iconUrl: wallet.icon,
    });
  }
  return out;
}

export default function WalletsSelectorContainer({ initialOpen = true, onClose, showTrigger = true }: { initialOpen?: boolean; onClose?: () => void; showTrigger?: boolean}) {
  const availableWallets = useWalletStore((state) => state.availableWallets);
  const refreshAvailableWallets = useWalletStore((state) => state.refreshAvailableWallets);
  const connectWallet = useWalletStore((state) => state.connectWallet);

  React.useEffect(() => {
    refreshAvailableWallets();
    let raf = 0;
    const onAnnounce = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        refreshAvailableWallets();
        raf = 0;
      });
    };
    const unsub =  eip6963Store.subscribe(onAnnounce);
    const onFocus = () => eip6963Store.requestProvider();
    if (typeof window !== "undefined") {
      window.addEventListener("focus", onFocus);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", onFocus);
      }
      unsub();
    };
  }, [refreshAvailableWallets]);

const onSelectWallet = async(rdns: string, detected: boolean) => {
  // if (detected) {
  //   await connectWallet(rdns);
  //   return;
  // }
  // const meta = WALLET_METADATA_BY_RDNS[rdns];
  // if (meta?.installUrl) window.open(meta.installUrl, "_blank", "noopener,noreferrer");

  const meta = WALLET_METADATA_BY_RDNS[rdns];
  if (detected) {
    await connectWallet(rdns);
    return;
  }
  // When not detected, either deep-link to install or trigger WalletConnectQR
  if (meta?.brand === "WalletConnect") {
    const { env } = await import("@/lib/env");
    const { NEXT_PUBLIC_WALLETCONNECT_ID } = env();
    if (!NEXT_PUBLIC_WALLETCONNECT_ID) {
      console.error("Missing NEXT_PUBLIC_WALLETCONNECT_ID");
      return;
    }
    // Derive the configured chain
    const targetChainId = wagmiConfig.chains[0]?.id;
    if (!targetChainId) {
      console.error("No chains configured in wagmiConfig");
      return;
    }
    try {
      const connector = walletConnectForQR({ projectId: NEXT_PUBLIC_WALLETCONNECT_ID})
      await connect(wagmiConfig, { connector });
      // Ensure we are on the configured chain. If missing, provide EIP-3085 params so the wallet can add it.
      const { VIA_NETWORK_CONFIG, BRIDGE_CONFIG } = await import('@/services/config');
      const addParams = VIA_NETWORK_CONFIG[BRIDGE_CONFIG.defaultNetwork];
      let switchedOk = true;
      try {
        await switchChain(wagmiConfig, {
          chainId: targetChainId,
          addEthereumChainParameter: {
            chainName: wagmiConfig.chains[0]?.name ?? addParams.chainName,
            nativeCurrency: addParams.nativeCurrency,
            rpcUrls: addParams.rpcUrls,
            blockExplorerUrls: addParams.blockExplorerUrls,
          },
        });
      } catch (err) {
        console.error('switchChain failed for WalletConnect (add/switch Via)', err);
        switchedOk = false;
      }

      const account = getAccount(wagmiConfig);
      const address = account?.address;
      const state = useWalletStore.getState();
      state.setViaAddress(address ?? null);
      state.setIsMetamaskConnected(!!address);
      state.setSelectedWallet(rdns); // '.com.walletconnect'
      // Verify chain id from provider when available, and set correctness accordingly.
      let verifiedOk = switchedOk;
      try {
        const { getPreferredWeb3ProviderAsync } = await import('@/utils/ethereum-provider');
        const bestProvider = await getPreferredWeb3ProviderAsync();
        if (bestProvider) {
          const hex = await bestProvider.provider.request({ method: 'eth_chainId' });
          const expectedHex = VIA_NETWORK_CONFIG[BRIDGE_CONFIG.defaultNetwork].chainId;
          const ok = typeof hex === 'string' && hex.toLowerCase() === expectedHex.toLowerCase();
          verifiedOk = ok;
        }
      } catch (e) {
        // non-fatal: keep switchedOk value
      }
      state.setIsCorrectViaNetwork(verifiedOk);
      // Load local tx after connect
      state.loadLocalTransactions();
      walletEvents.metamaskConnected.emit();
      return;
    } catch (err) {
      console.error('WalletConnect flow failed:', err);
      return;
    }
  }
  if (meta?.installUrl) {
    window.open(meta.installUrl, "_blank", "noopener,noreferrer");
  }
};

return (
  <WalletSelector
    availableWallets={availableWallets}
    onRefresh={refreshAvailableWallets}
    onSelectWallet={onSelectWallet}
    initialOpen={initialOpen}
    onOpenChange={(open) => {
      if (!open) onClose?.();
      }}
      showTrigger={showTrigger}
  />
);
}
