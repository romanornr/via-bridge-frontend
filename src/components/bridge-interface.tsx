"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import DepositForm from "@/components/deposit-form";
import WithdrawForm from "@/components/withdraw-form";
import WalletConnectButton from "@/components/wallet-connect-button";
import { WalletConnectButton as EVMConnectButton } from "@/components/wallets/connect-button"
import { useWalletState } from "@/hooks/use-wallet-state";
import { Button } from "@/components/ui/button";
import { AlertCircle, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { Layer } from "@/services/config";
import { walletEvents } from "@/store/wallet-store";
import { TransactionHistory } from "@/components/transaction-history";
import { useWalletStore } from "@/store/wallet-store";
import {EvmWalletConnectCard} from "@/components/wallets/connect-card";

export default function BridgeInterface() {
  const [activeTab, setActiveTab] = useState<string>("deposit");
  // const [refreshKey, setRefreshKey] = useState(0);
  const [showTransactions, setShowTransactions] = useState(false);

  const {
    transactions,
    isLoadingTransactions,
    fetchTransactions
  } = useWalletStore();

  const {
    bitcoinAddress,
    bitcoinPublicKey,
    viaAddress,
    isXverseConnected,
    isMetamaskConnected,
    isCorrectBitcoinNetwork,
    isCorrectViaNetwork,
    connectXverse,
    connectMetamask,
    disconnectXverse,
    disconnectMetamask,
    switchNetwork,
  } = useWalletState();

  // Check if any wallet is connected
  const isBothWalletConnected = isXverseConnected && isMetamaskConnected;

  // Fetch transactions when wallets are connected
  useEffect(() => {
    if (isBothWalletConnected) {
      fetchTransactions();
    }
  }, [isXverseConnected, isMetamaskConnected, fetchTransactions]);

  // Set up a polling interval to refresh transactions
  useEffect(() => {
    if (!isBothWalletConnected) return;

    const interval = setInterval(() => {
      fetchTransactions();
    }, 300000); // Refresh every 10 minutes

    return () => clearInterval(interval);
  }, [isBothWalletConnected, fetchTransactions]);

  // Listen for wallet events to refresh the UI and transactions
  useEffect(() => {
    const unsubscribers = [
      walletEvents.metamaskConnected.on(() => {
        // setRefreshKey(prev => prev + 1);
        fetchTransactions();
      }),
      walletEvents.xverseConnected.on(() => {
        // setRefreshKey(prev => prev + 1);
        fetchTransactions();
      }),
      // walletEvents.metamaskDisconnected.on(() => setRefreshKey(prev => prev + 1)),
      // walletEvents.xverseDisconnected.on(() => setRefreshKey(prev => prev + 1)),
      walletEvents.networkChanged.on(() => {
        // setRefreshKey(prev => prev + 1);
        fetchTransactions();
      }),
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [fetchTransactions]);

  // Connect to appropriate wallet based on active tab
  useEffect(() => {
    if (activeTab === "deposit" && !isXverseConnected) {
      // Optional auto-connect logic
    } else if (activeTab === "withdraw" && !isMetamaskConnected) {
      // Option al auto-connect logic
    }
  }, [activeTab, isXverseConnected, isMetamaskConnected]);

  return (
    <div className="flex flex-col items-center pb-6">
      <Card className="w-full max-w-md shadow-lg bg-white border-border/50">
        <CardContent>
          {/* {(isXverseConnected) && (!isCorrectBitcoinNetwork) && <NetworkWarning layer={Layer.L1} />} */}
          {/* {(isMetamaskConnected) && (!isCorrectViaNetwork) && <NetworkWarning layer={Layer.L2} />} */}
          <Tabs defaultValue="deposit" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 h-10 bg-slate-100 p-1 rounded-xl">
              <TabsTrigger
                value="deposit"
                className="text-sm font-medium rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all duration-200 hover:bg-white/80"
              >
                Deposit
              </TabsTrigger>
              <TabsTrigger
                value="withdraw"
                className="text-sm font-medium rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all duration-200 hover:bg-white/80"
              >
                Withdraw
              </TabsTrigger>
            </TabsList>

            <TabsContent value="deposit">
              {isXverseConnected ? (
                isCorrectBitcoinNetwork ? (
                  <DepositForm
                    bitcoinAddress={bitcoinAddress}
                    bitcoinPublicKey={bitcoinPublicKey}
                    onDisconnect={disconnectXverse}
                    onTransactionSubmitted={fetchTransactions}
                  />
                ) : (
                  <div className="flex flex-col items-center space-y-4 py-6">
                    <AlertCircle className="h-12 w-12 text-amber-500" />
                    <h3 className="text-lg font-semibold">Wrong Network</h3>
                    <p className="text-sm text-center text-muted-foreground max-w-[280px]">
                      Please switch to the correct Bitcoin network to continue.
                    </p>
                    <Button onClick={() => switchNetwork(Layer.L1)}>Switch Network</Button>
                  </div>
                )
              ) : (
                <WalletConnectButton
                  walletType="xverse"
                  isConnected={isXverseConnected}
                  onConnect={connectXverse}
                  onDisconnect={disconnectXverse}
                />
              )}
            </TabsContent>

            <TabsContent value="withdraw">
              {isMetamaskConnected ? (
                isCorrectViaNetwork ? (
                  <WithdrawForm viaAddress={viaAddress} onTransactionSubmitted={fetchTransactions} />
                ) : (
                  <div className="flex flex-col items-center space-y-4 py-6">
                    <AlertCircle className="h-12 w-12 text-amber-500" />
                    <h3 className="text-lg font-semibold">Wrong Network</h3>
                    <p className="text-sm text-center text-muted-foreground max-w-[280px]">
                      Please switch to the VIA network to continue.
                    </p>
                    <Button onClick={() => switchNetwork(Layer.L2)}>Switch Network</Button>
                  </div>
                )
              ) : (
              <EvmWalletConnectCard />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>

        {isBothWalletConnected && (
          <CardFooter className="flex flex-col px-6 pt-0">
            <Button
              variant="ghost"
              className="flex items-center justify-between w-full py-2 text-sm font-medium"
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
              <div className="w-full mt-2">
                <TransactionHistory isLoading={isLoadingTransactions} onRefresh={fetchTransactions} />
              </div>
            )}
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
