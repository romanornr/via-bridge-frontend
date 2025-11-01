"use client";

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useWalletStore } from '@/store/wallet-store';
import { eip6963Store } from '@/utils/eip6963-provider';
import { resolveIcon, resolveDisplayName } from '@/utils/wallet-metadata';
import { getPreferredWeb3ProviderAsync } from '@/utils/ethereum-provider';

const WalletsSelectorContainer = dynamic(() => import('./selector-container'), { ssr: false });

/**
 * Renders a card component that facilitates the connection to an EVM-compatible wallet.
 * The card displays the wallet's name and icon and provides a button to initiate the wallet connection process.
 * It also handles automatic discovery of a preferred wallet and updates the displayed metadata
 * when the selected wallet changes.
 *
 * @return {JSX.Element} A JSX element representing the wallet connect card, including the wallet icon, name, and connect button.
 */
export function EvmWalletConnectCard() {
  const [showSelector, setShowSelector] = React.useState(false);
  const [walletIcon, setWalletIcon] = React.useState<string>('/metamask-logo.svg');
  const [walletName, setWalletName] = React.useState<string>('MetaMask');

  const selectedWallet = useWalletStore((state) => state.selectedWallet);

  const handleOpen = React.useCallback(() => setShowSelector(true), []);
  const handleClose = React.useCallback(() => setShowSelector(false), []);

  // Discover preferred wallet on mount
  React.useEffect(() => {
    let cancelled = false;

    async function discoverWallet() {
      try {
        const best = await getPreferredWeb3ProviderAsync(500);
        if (cancelled) return;

        if (best) {
          const detail = eip6963Store.getAllWalletProviders().find(p => p.info.rdns === best.rdns);
          if (detail) {
            setWalletIcon(resolveIcon(detail) ?? '/metamask-logo.svg');
            setWalletName(resolveDisplayName(detail) ?? 'EVM Wallet');
          }
        }
      } catch (error) {
        console.error('Failed to discover wallet:', error);
      }
    }
    discoverWallet();
    return () => { cancelled = true; };
  }, []);

  // Update wallet metadata based on selected wallet
  React.useEffect(() => {
    if (selectedWallet) {
      const provider = eip6963Store.getAllWalletProviders().find((p) => p.info.rdns === selectedWallet);
      if (provider) {
        const icon = resolveIcon(provider);
        const name = resolveDisplayName(provider);
        setWalletIcon(icon ?? '/metamask-logo.svg');
        setWalletName(name ?? 'EVM Wallet');
      }
    } else {
      // Default to generic/meta mask
      setWalletIcon('/metamask-logo.svg');
      setWalletName('MetaMask');
    }
  }, [selectedWallet]);

  return (
    <>
      <div className="flex flex-col items-center justify-center p-8 space-y-6 bg-slate-50/50 rounded-xl border border-border/50 backdrop-blur-sm">
        {/* Wallet Icon */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
          <div className="relative rounded-full bg-gradient-to-br from-primary/10 to-primary/5 p-4 ring-1 ring-primary/20">
            <span
              className="pointer-events-none absolute inset-0 rounded-full z-0 bg-primary/30 ring-2 ring-primary/50 animate-ping"
              style={{ animationDuration: '1.8s' }}
              aria-hidden="true"
            />
            <Image src={walletIcon} alt={walletName} width={32} height={32} priority unoptimized={!walletIcon.startsWith('/')} className="relative z-10"
            />
          </div>
        </div>

        {/* Title & Description */}
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold">Connect Wallet</h3>
          <p className="text-sm text-muted-foreground max-w-[280px]">
            Wallet connection such as {walletName} or another supported wallet is to withdraw BTC from VIA to Bitcoin network
          </p>
        </div>

        {/* Connect Button */}
        <Button onClick={handleOpen} className="w-full h-11 text-base font-medium shadow-sm hover:shadow-md transition-all duration-200">Connect EVM Wallet</Button>
      </div>

      {showSelector && (
        <WalletsSelectorContainer initialOpen={true} onClose={handleClose} showTrigger={false} />
      )}
    </>
  );
}
