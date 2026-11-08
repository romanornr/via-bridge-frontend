// src/components/bridge-interface.tsx
"use client";

import {BridgeForm} from "@/components/bridge";
import {useCallback, useEffect, useState} from "react";
import {TransactionHistory} from "@/components/transaction-history";
import {useWalletStore, walletEvents} from "@/store/wallet-store";
import {Button} from "@/components/ui/button";
import {ChevronDown, ChevronUp, Clock} from "lucide-react";

/**
 * Bridge Interface
 * Main entry point for the bridge page including the bridge form and transaction history
 */
export default function BridgeInterface() {
  const [showTransactions, setShowTransactions] = useState(false);

  const {
    bitcoinAddress,
    viaAddress,
    isXverseConnected,
    isMetamaskConnected,
    transactions,
    isLoadingTransactions,
    fetchTransactions
  } = useWalletStore();

  // Check if any wallet is connected
  const isAnyWalletConnected = isXverseConnected || isMetamaskConnected;

  // Check if there are any pending transactions
  const hasPendingTransactions = transactions.some(tx => tx.status !== "Processed" && tx.status !== "Failed");

  // Memoized fetch function
  const handleRefresh = useCallback(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Fetch transactions when wallet address change
  useEffect(() => {
    if (bitcoinAddress || viaAddress) {
      handleRefresh();
    }
  }, [bitcoinAddress, viaAddress, handleRefresh]);

  // Only poll when there are pending transactions
  useEffect(() => {
    if (!isAnyWalletConnected || !hasPendingTransactions) return;

    const interval = setInterval(() => {
      fetchTransactions();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [isAnyWalletConnected, hasPendingTransactions, fetchTransactions]);

  // Listen for wallet events to refresh transactions
  useEffect(() => {
    const unsubscribers = [
      walletEvents.metamaskConnected.on(() => fetchTransactions()),
      walletEvents.xverseConnected.on(() => fetchTransactions()),
      walletEvents.networkChanged.on(() => fetchTransactions())
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [fetchTransactions]);

  return (
    <div className="w-full flex flex-col items-center pb-6">
      <BridgeForm/>

      {/*Transaction History shown when any wallet is connected*/}
      {isAnyWalletConnected && (
        <div className="w-full max-w-4xl px-4 mt-1">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs">
            <Button
              variant="ghost"
              className="flex items-center justify-between w-full py-4 px-6 text-sm font-medium"
              onClick={() => setShowTransactions(!showTransactions)}
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Transaction History</span>
                {transactions.length > 0 && (
                  <span className="bg-primary/10 text-primary text-xs rounded-full px-2 py-0.5">
                    {transactions.length}
                  </span>
                )}
              </div>
              {showTransactions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            {showTransactions && (
              <div className="px-6 pb-6">
                <TransactionHistory
                  isLoading={isLoadingTransactions}
                  onRefresh={handleRefresh}
                  transactions={transactions}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
