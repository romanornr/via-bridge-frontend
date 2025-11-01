'use client';

import * as React from 'react';
import WalletsSelectorContainer from '@/components/wallets/selector-container';
import { AppWagmiProvider } from '@/lib/wagmi/provider';

export default function ConnectWalletPage() {
  return (
    <AppWagmiProvider>
      <div className="p-8 space-y6">
        <h1 className="text-3xl font-bold">Connect Wallet</h1>
        <WalletsSelectorContainer initialOpen={false} showTrigger={true} />
      </div>
      <WalletsSelectorContainer showTrigger={false} />
    </AppWagmiProvider>
  );
}