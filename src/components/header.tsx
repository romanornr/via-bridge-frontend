"use client";

import Image from "next/image";
import Link from "next/link";
import { useWalletState } from "@/hooks/use-wallet-state";
import { Button } from "@/components/ui/button";
import { LogOut, AlertCircle, Menu } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Layer } from "@/services/config";
import { getPreferredWeb3ProviderAsync } from "@/utils/ethereum-provider";
import { useMobile } from "@/hooks/use-mobile";
import { WalletConnectButton as EVMSelectorButton } from "@/components/wallets/connect-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";


export default function Header() {
  const { isMobile, mounted } = useMobile();
  const {
    isXverseConnected,
    isMetamaskConnected,
    bitcoinAddress,
    viaAddress,
    disconnectXverse,
    disconnectMetamask,
    connectXverse,
    connectMetamask,
    isCorrectBitcoinNetwork,
    isCorrectViaNetwork,
    switchNetwork
  } = useWalletState();

  const [isConnectingXverse, setIsConnectingXverse] = useState(false);
  const [isConnectingMetaMask, setIsConnectingMetaMask] = useState(false);

  const handleConnectXverse = async () => {
    try {
      setIsConnectingXverse(true);
      const connected = await connectXverse();
      if (connected) {
        toast.success("Xverse Connected", {
          description: "Successfully connected to your Xverse wallet.",
          duration: 4000
        });
      }
    } catch (error) {
      console.error("Xverse connection error:", error);
      toast.error("Connection Failed", {
        description: "Unable to connect to Xverse. Please try again.",
        duration: 4000
      });
    } finally {
      setIsConnectingXverse(false);
    }
  };

  const handleConnectMetamask = async () => {
    try {
      setIsConnectingMetaMask(true);
      const connected = await connectMetamask();
      if (connected) {
        const best = await getPreferredWeb3ProviderAsync();
        const displayName = best?.name ?? "Web3 Wallet";
        toast.success(`${displayName} Connected`, {
          description: `Successfully connected to your ${displayName} wallet.`,
          duration: 4000
        });
      }
    } catch (error) {
      console.error("Web3 wallet connection error:", error);
      const best = await getPreferredWeb3ProviderAsync();
      const displayName = best?.name ?? "Web3 Wallet";
      toast.error("Connection Failed", {
        description: `Unable to connect to ${displayName}. Please try again.`,
        duration: 4000
      });
    } finally {
      setIsConnectingMetaMask(false);
    }
  };

  const handleDisconnectXverse = () => {
    disconnectXverse();
    toast.success("Xverse Disconnected", {
      description: "Successfully disconnected from your Xverse wallet.",
      duration: 4000
    });
  };

  const handleDisconnectMetamask = async () => {
    const best = await getPreferredWeb3ProviderAsync();
    const displayName = best?.name ?? "Web3 Wallet";
    disconnectMetamask();
    toast.success(`${displayName} Disconnected`, {
      description: `Successfully disconnected from your ${displayName} wallet.`,
      duration: 4000
    });
  };

  const handleSwitchNetwork = (layer: Layer) => {
    switchNetwork(layer);
  };

  // Wallet connection buttons for dropdown menu
  const renderWalletOptions = () => (
    <>
      <DropdownMenuLabel>Bitcoin Wallet</DropdownMenuLabel>
      {isXverseConnected ? (
        <>
          <DropdownMenuItem className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 ${isCorrectBitcoinNetwork ? 'bg-green-500' : 'bg-amber-500'} rounded-full`}></div>
              <span>BTC: {bitcoinAddress?.slice(0, 6)}...{bitcoinAddress?.slice(-4)}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 ml-2 text-slate-500 hover:text-slate-700"
              onClick={(e) => {
                e.stopPropagation();
                handleDisconnectXverse();
              }}
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuItem>
          {!isCorrectBitcoinNetwork && (
            <DropdownMenuItem 
              onClick={() => handleSwitchNetwork(Layer.L1)}
              className="text-amber-600"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Switch to correct Bitcoin network
            </DropdownMenuItem>
          )}
        </>
      ) : (
        <DropdownMenuItem 
          onClick={handleConnectXverse}
          disabled={isConnectingXverse}
        >
          {isConnectingXverse ? "Connecting..." : "Connect Xverse"}
        </DropdownMenuItem>
      )}

      <DropdownMenuSeparator />
      
      <DropdownMenuLabel>VIA Wallet</DropdownMenuLabel>
      {isMetamaskConnected ? (
        <>
          <DropdownMenuItem className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 ${isCorrectViaNetwork ? 'bg-green-500' : 'bg-amber-500'} rounded-full`}></div>
              <span>VIA: {viaAddress?.slice(0, 6)}...{viaAddress?.slice(-4)}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 ml-2 text-slate-500 hover:text-slate-700"
              onClick={(e) => {
                e.stopPropagation();
                handleDisconnectMetamask();
              }}
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuItem>
          {!isCorrectViaNetwork && (
            <DropdownMenuItem 
              onClick={() => handleSwitchNetwork(Layer.L2)}
              className="text-amber-600"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Switch to VIA network
            </DropdownMenuItem>
          )}
        </>
      ) : (
        <DropdownMenuItem asChild>
          <EVMSelectorButton />
        </DropdownMenuItem>
      )}
    </>
  );

  return (
    <header className="w-full py-3 px-1 md:py-4 md:px-6 bg-white border-b border-slate-200">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/icon.png"
              alt="VIA Bridge"
              width={28}
              height={28}
              priority
              className="md:w-8 md:h-8"
            />
            <span className="text-lg md:text-l font-bold">VIA Bridge</span>
          </Link>
          <span className="text-[10px] md:text-xs font-semibold px-1.5 py-0.5 md:px-2 md:py-0.5 bg-orange-100 text-orange-800 rounded-md border border-orange-200">
            Alpha Testnet
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!mounted ? (
            // Show desktop layout during SSR/hydration to prevent mismatch
            <div className="flex items-center gap-2">
              {isXverseConnected ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2"
                  onClick={handleDisconnectXverse}
                >
                  <div className={`w-2 h-2 ${isCorrectBitcoinNetwork ? 'bg-green-500' : 'bg-amber-500'} rounded-full`}></div>
                  <span>BTC: {bitcoinAddress?.slice(0, 6)}...{bitcoinAddress?.slice(-4)}</span>
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleConnectXverse}
                  disabled={isConnectingXverse}
                >
                  {isConnectingXverse ? "Connecting..." : "Connect Xverse"}
                </Button>
              )}
              
              {isMetamaskConnected ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2"
                  onClick={handleDisconnectMetamask}
                >
                  <div className={`w-2 h-2 ${isCorrectViaNetwork ? 'bg-green-500' : 'bg-amber-500'} rounded-full`}></div>
                  <span>VIA: {viaAddress?.slice(0, 6)}...{viaAddress?.slice(-4)}</span>
                </Button>
              ) : (
                <EVMSelectorButton />
              )}
            </div>
          ) : isMobile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 flex items-center gap-1.5">
                  <Menu className="h-3.5 w-3.5" />
                  <span>Wallets</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {renderWalletOptions()}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              {isXverseConnected ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2"
                  onClick={handleDisconnectXverse}
                >
                  <div className={`w-2 h-2 ${isCorrectBitcoinNetwork ? 'bg-green-500' : 'bg-amber-500'} rounded-full`}></div>
                  <span>BTC: {bitcoinAddress?.slice(0, 6)}...{bitcoinAddress?.slice(-4)}</span>
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleConnectXverse}
                  disabled={isConnectingXverse}
                >
                  {isConnectingXverse ? "Connecting..." : "Connect Xverse"}
                </Button>
              )}
              
              {isMetamaskConnected ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2"
                  onClick={handleDisconnectMetamask}
                >
                  <div className={`w-2 h-2 ${isCorrectViaNetwork ? 'bg-green-500' : 'bg-amber-500'} rounded-full`}></div>
                  <span>VIA: {viaAddress?.slice(0, 6)}...{viaAddress?.slice(-4)}</span>
                </Button>
              ) : (
                <EVMSelectorButton />
                // <Button
                //   variant="outline"
                //   size="sm"
                //   onClick={handleConnectMetamask}
                //   disabled={isConnectingMetaMask}
                // >
                //   {isConnectingMetaMask ? "Connecting..." : "Connect EVM Wallet"}
                // </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
