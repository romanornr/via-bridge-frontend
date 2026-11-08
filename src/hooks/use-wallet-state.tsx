"use client";

import { useEffect } from "react";
import { useWalletStore } from "@/store/wallet-store";
import { getPreferredWeb3ProviderAsync } from "@/utils/ethereum-provider";
import { maskAddress, maskAddresses } from "@/utils";

export function useWalletState() {
  const walletStore = useWalletStore();

  // Check network and connection status on mount
  useEffect(() => {
    async function checkConnections() {
      await walletStore.checkXverseConnection();
      await walletStore.checkMetamaskNetwork();
      // Ethereum bridge deposit depends on isCorrectL1Network to fetch L1 token balance.
      // Without this, users on eg., Ethereum/Sepolia already would see 0 balance until chainChanged fires.
      await walletStore.checkL1Network();
    }

    checkConnections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set up Xverse wallet event listeners
  useEffect(() => {
    const setupXverseListeners = async () => {
      try {
        const { addListener } = await import("sats-connect");

        // Listen for network changes
        const handleNetworkChange = () => {
          console.log("Xverse network changed");
          walletStore.checkXverseConnection();
        };

        // Listen for connection status changes
        const handleConnectionChange = (connected: boolean) => {
          console.log("Xverse connection changed:", connected);
          if (connected) {
            walletStore.checkXverseConnection();
          } else {
            walletStore.setIsXverseConnected(false);
            walletStore.setBitcoinAddress(null);
            walletStore.setBitcoinPublicKey(null);
            walletStore.setIsCorrectBitcoinNetwork(false);
          }
        };

        const networkChangeListener = addListener({
          eventName: "networkChange",
          cb: () => handleNetworkChange(),
        });

        const disconnectListener = addListener({
          eventName: "disconnect",
          cb: () => handleConnectionChange(false),
        });

        // Clean up listeners on unmount
        return () => {
          networkChangeListener();
          disconnectListener();
        };
      } catch (error) {
        console.error("Failed to set up Xverse event listeners:", error);
      }
    };

    setupXverseListeners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for metmask account and network changes
  useEffect(() => {
    let mounted = true;

    const setupProviderListener = async () => {
      if (typeof window == "undefined") return;

      const bestProvider = await getPreferredWeb3ProviderAsync();

      if (!mounted) return;

      if (!bestProvider) {
        console.log('Wallet not available for account change monitoring');
        return;
      }

      const provider = bestProvider.provider;

      const handleAccountsChanged = (accounts: string[]) => {
        console.log('MetaMask accounts changed:', maskAddresses(accounts));

        if (accounts.length === 0) {
          console.log('MetaMask disconnected or locked');
          walletStore.disconnectMetamask();
        } else {
          console.log('Active account:', maskAddress(accounts[0]));

          walletStore.setViaAddress(accounts[0]);
          if (!walletStore.isMetamaskConnected) {
            walletStore.setIsMetamaskConnected(true);
          }

          walletStore.checkMetamaskNetwork();
        }
      };

      const handleChainChanged = async (chainId: string) => {
        console.log('MetaMask chain changed to:', chainId);
        // check if we're on the correct network
        await walletStore.checkMetamaskNetwork();
        await walletStore.checkL1Network();
      };

      if (provider.on) {
        provider.on('accountsChanged', handleAccountsChanged);
        provider.on('chainChanged', handleChainChanged);
      }

      return () => {
        if (provider?.removeListener) {
          provider.removeListener('accountsChanged', handleAccountsChanged);
          provider.removeListener('chainChanged', handleChainChanged);
        }
      };
    };

    setupProviderListener().catch(console.error);

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    bitcoinAddress: walletStore.bitcoinAddress,
    bitcoinPublicKey: walletStore.bitcoinPublicKey,
    viaAddress: walletStore.viaAddress,
    chainId: walletStore.chainId,
    l1Address: walletStore.l1Address,
    isXverseConnected: walletStore.isXverseConnected,
    isMetamaskConnected: walletStore.isMetamaskConnected,
    isL1Connected: walletStore.isL1Connected,
    isCorrectBitcoinNetwork: walletStore.isCorrectBitcoinNetwork,
    isCorrectViaNetwork: walletStore.isCorrectViaNetwork,
    isCorrectL1Network: walletStore.isCorrectL1Network,
    connectXverse: walletStore.connectXverse,
    connectMetamask: walletStore.connectMetamask,
    connectL1Wallet: walletStore.connectL1Wallet,
    disconnectXverse: walletStore.disconnectXverse,
    disconnectMetamask: walletStore.disconnectMetamask,
    switchNetwork: walletStore.switchNetwork,
  };
}
