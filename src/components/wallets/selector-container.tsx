'use client';
import * as React from 'react';
import WalletSelector, {DetectedWallet} from './selector';
import { useWalletStore } from '@/store/wallet-store';
import { WALLET_METADATA_BY_RDNS} from "@/utils/wallet-metadata";
import {eip6963Store} from "@/utils/eip6963-provider";

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
  if (detected) {
    await connectWallet(rdns);
    return;
  }
  const meta = WALLET_METADATA_BY_RDNS[rdns];
  if (meta?.installUrl) window.open(meta.installUrl, "_blank", "noopener,noreferrer");
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