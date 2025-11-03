"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {ExternalLink} from "lucide-react";
import {WALLET_METADATA_BY_RDNS} from "@/utils/wallet-metadata";

export type WalletSelectorWallet = { name: string; rdns: string; icon?: string };

export type DetectedWallet = {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
}

function buildDetectedWallets(availableWallets: Array<{ name: string, rdns: string; icon?: string}>): DetectedWallet[] {
  const out: DetectedWallet[] = [];
  for (const wallet of availableWallets) {
    const id = wallet.rdns;
    const meta = WALLET_METADATA_BY_RDNS[id];
    if (!meta) continue; // only show supported wallets
    out.push({
      id,
      name: meta.name ?? wallet.name,
      description: "Detected in your browser",
      // Prefer bundled icon, fallback to provider icon (matches resolveIcon logic)
      iconUrl: meta.iconPath ?? wallet.icon,
    });
  }
  return out;
}

export default function WalletSelector({
  availableWallets,
  onSelectWallet,
  initialOpen = true,
  onOpenChange,
  showTrigger = true,
}: {
  availableWallets: WalletSelectorWallet[];
  onRefresh: () => void;
  onSelectWallet: (rdns: string, detected: boolean) => Promise<void>;
  initialOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}) {
  const [open, setOpen] = React.useState(initialOpen);

  const onSelectedWallet = async (rdns: string) => {
    try {
      await onSelectWallet(rdns, detectedSet.has(rdns));
      if (detectedSet.has(rdns)) setOpen(false);
    } catch (e) {
      console.error("Error connecting wallet", e);
    }
  };

  const detectedWallets = React.useMemo(() => buildDetectedWallets(availableWallets), [availableWallets]);

  const detectedSet = React.useMemo(() => new Set(detectedWallets.map((w) => w.id)), [detectedWallets]);

  const supportedWallets = React.useMemo(() => {
    const all = Object.keys(WALLET_METADATA_BY_RDNS);
    const rdnsToShow = all.filter((rdns) => !detectedSet.has(rdns));
    rdnsToShow.sort((a, b) => {
      const aMeta = WALLET_METADATA_BY_RDNS[a];
      const bMeta = WALLET_METADATA_BY_RDNS[b];
      if (aMeta.name < bMeta.name) return -1;
      if (aMeta.name > bMeta.name) return 1;
      return 0;
    });

    return rdnsToShow.map((rdns) => {
      const meta = WALLET_METADATA_BY_RDNS[rdns];
      return {
        id: rdns,
        name: meta?.name ?? rdns,
        description: meta?.brand=== "WalletConnect" ? "QR connect to mobile" : "Install to use",
        iconUrl: meta?.iconPath,
      };
    });
  }, [detectedSet]);

  return (
    <div className="p-8 space-y-4">

      {showTrigger && (
        <Button onClick={() => setOpen(true)}>Connect</Button>
      )}

      <Dialog
        open={open}
        onOpenChange={(v) => {
                setOpen(v);
                onOpenChange?.(v);
        }}
      >

        <DialogContent className="sm:max-w-md p-0 gap-0">
          {/* Header */}
          <DialogHeader className="p-8 pb-6 space-y-2">
            <DialogTitle className="text-xl font-semibold">Connect wallet</DialogTitle>
            <p className="text-sm text-muted-foreground">Choose your preferred wallet</p>
          </DialogHeader>

          {/* Wallet lists */}
          <div className="px-8 pb-0 space-y-6">
            {/* Detected wallets */}
            {detectedWallets.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-xs font-semibold text-green-700 tracking-wide">
                    DETECTED
                  </span>
                </div>

                <div className="space-y-2">
                  {detectedWallets.map((wallet) => (
                    <button key={wallet.id} onClick={() => onSelectedWallet(wallet.id)}  className="w-full p-4 rounded-lg bg-white border-2 border-slate-200 hover:bg-slate-50 transition-colors text-left group">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="relative w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={wallet.iconUrl} alt={wallet.name} className="w-10 h-10 rounded-md" />
                          </div>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <h3 className="font-semibold text-slate-900">{wallet.name}</h3>
                          </div>
                          <p className="text-sm text-blue-900">{wallet.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Other Wallets Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-600 tracking-wide">SUPPORTED WALLETS</h3>
              <div className="space-y-2">
                {supportedWallets.map((wallet) => (
                  <button key={wallet.id} onClick={() => onSelectedWallet(wallet.id)} className="w-full p-4 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors text-left group">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={wallet.iconUrl} alt={wallet.name} className="w-10 h-10 rounded-md" />
                      </div>

                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">{wallet.name}</h3>
                        {wallet.description && (
                          <p className="text-sm text-slate-600">{wallet.description}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="px=8 pb-8 pt-6 border-t border-slate-200">
              <div className="text-center space-y-2">
                <p className="text-xs text-slate-600">New to EVM wallets?</p>
                <a href="https://google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline hover:text-blue-700">Learn more <ExternalLink className="w-3 h-3"/> </a>
              </div>
            </div>

          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}