import { create } from 'zustand';
import {BRIDGE_CONFIG, Layer} from '@/services/config';
import { createEvent } from "@/utils/events";
import { getPreferredWeb3ProviderAsync } from "@/utils/ethereum-provider";
import { WalletNotFoundError } from "@/utils/wallet-errors";
import { fetchUserTransactions, mapApiTransactionsToAppFormat, fetchFeeEstimation, fetchDepositFeeEstimation } from "@/services/api";
import { maskAddress } from "@/utils";
import { resolveDisplayName, resolveIcon } from '@/utils/wallet-metadata';

// Create events for wallet state changes
export const walletEvents = {
  metamaskConnected: createEvent<void>('metamask-connected'),
  xverseConnected: createEvent<void>('xverse-connected'),
  metamaskDisconnected: createEvent<void>('metamask-disconnected'),
  xverseDisconnected: createEvent<void>('xverse-disconnected'),
  networkChanged: createEvent<void>('network-changed'),
  walletChanged: createEvent<string>('wallet-changed'),
  walletRefreshed: createEvent<void>('wallet-refreshed'),
};

export type TransactionStatus =
  'Pending' |
  'InProgress' |
  'ExecutedOnL2' |
  'CommittedToL1' |
  'ProvedOnL1' |
  'ExecutedOnL1' |
  'Processed' |
  'Failed'

interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw';
  amount: string;
  status: TransactionStatus;
  timestamp: number;
  txHash: string;
  l1ExplorerUrl?: string;
  l2ExplorerUrl?: string;
}

interface FeeEstimation {
  fee: number;
}

// LocalStorage utility functions
const LOCALSTORAGE_KEY = 'wallet_local_transactions';

const loadLocalTransactionsFromStorage = (): Transaction[] => {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(LOCALSTORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load transactions from localStorage:', error);
    return [];
  }
};

const saveLocalTransactionsToStorage = (transactions: Transaction[]): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(transactions));
  } catch (error) {
    console.error('Failed to save transactions to localStorage:', error);
  }
};

const removeTransactionsFromStorage = (txHashes: string[]): void => {
  if (typeof window === 'undefined') return;

  try {
    const stored = loadLocalTransactionsFromStorage();
    const filtered = stored.filter(tx => !txHashes.includes(tx.txHash));
    saveLocalTransactionsToStorage(filtered);
  } catch (error) {
    console.error('Failed to remove transactions from localStorage:', error);
  }
};

interface WalletState {
  bitcoinAddress: string | null;
  bitcoinPublicKey: string | null;
  viaAddress: string | null;
  isXverseConnected: boolean;
  isMetamaskConnected: boolean;
  isCorrectBitcoinNetwork: boolean;
  isCorrectViaNetwork: boolean;
  transactions: Transaction[];
  isLoadingTransactions: boolean;
  isLoadingFeeEstimation: boolean;
  localTransactions: Transaction[];
  feeEstimation: FeeEstimation | null;

  // Multi wallet support
  availableWallets: Array<{name: string, rdns: string, icon?: string}>;
  selectedWallet: string | null; // rdns of selected wallet

  // Actions
  setBitcoinAddress: (address: string | null) => void;
  setBitcoinPublicKey: (publicKey: string | null) => void;
  setViaAddress: (address: string | null) => void;
  setIsXverseConnected: (connected: boolean) => void;
  setIsMetamaskConnected: (connected: boolean) => void;
  setIsCorrectBitcoinNetwork: (correct: boolean) => void;
  setIsCorrectViaNetwork: (correct: boolean) => void;
  addTransaction: (tx: Omit<Transaction, 'id' | 'timestamp'>) => void;
  updateTransactionStatus: (txHash: string, status: Transaction['status']) => void;
  clearTransactions: () => void;
  fetchTransactions: () => Promise<void>;
  fetchFeeEstimation: (amount: number) => Promise<void>;
  fetchDepositFeeEstimation(amount: number): Promise<void>;
  resetFeeEstimation: () => void;
  addLocalTransaction: (tx: Omit<Transaction, 'id' | 'timestamp'>) => void;
  removeLocalTransaction: (txHash: string) => void;
  mergeTransactions: (apiTransactions: Transaction[]) => Transaction[];
  loadLocalTransactions: () => void;
  clearLocalTransactions: () => void;

  setAvailableWallets: (wallets: Array<{name: string, rdns: string, icon?: string}>) => void;
  setSelectedWallet: (rdns: string) => void;

  // Wallet operations
  connectXverse: () => Promise<boolean>;
  connectMetamask: () => Promise<boolean>;
  disconnectXverse: () => void;
  disconnectMetamask: () => void;
  switchNetwork: (layer: Layer) => Promise<boolean | void>;
  connectWallet: (rdns: string) => Promise<boolean>;
  refreshAvailableWallets: () => void;

  // Helper methods
  checkXverseConnection: () => Promise<void>;
  checkMetamaskNetwork: () => Promise<boolean | void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  // State
  bitcoinAddress: null,
  bitcoinPublicKey: null,
  viaAddress: null,
  isXverseConnected: false,
  isMetamaskConnected: false,
  isCorrectBitcoinNetwork: false,
  isCorrectViaNetwork: false,
  transactions: [],
  isLoadingTransactions: false,
  isLoadingFeeEstimation: false,
  localTransactions: [],
  feeEstimation: null,

  availableWallets: [],
  selectedWallet: null,

  // Setters
  setBitcoinAddress: (address) => set({ bitcoinAddress: address }),
  setBitcoinPublicKey: (publicKey) => set({ bitcoinPublicKey: publicKey }),
  setViaAddress: (address) => set({ viaAddress: address }),
  setIsXverseConnected: (connected) => set({ isXverseConnected: connected }),
  setIsMetamaskConnected: (connected) => set({ isMetamaskConnected: connected }),
  setIsCorrectBitcoinNetwork: (correct) => set({ isCorrectBitcoinNetwork: correct }),
  setIsCorrectViaNetwork: (correct) => set({ isCorrectViaNetwork: correct }),

  setAvailableWallets: (wallets) => set({ availableWallets: wallets }),
  setSelectedWallet: (rdns) => {
    const prev = get().selectedWallet;
    if (prev !== rdns) {
      set({ selectedWallet: rdns });
      // Notify services that the active EVM wallet changed
      walletEvents.walletChanged.emit(rdns);
    }
  },
  addTransaction: (tx) => set(state => ({
    transactions: [
      {
        ...tx,
        id: tx.txHash,
        timestamp: Date.now(),
      },
      ...state.transactions
    ]
  })),

  updateTransactionStatus: (txHash, status) => set(state => ({
    transactions: state.transactions.map(tx =>
      tx.txHash === txHash ? { ...tx, status } : tx
    )
  })),

  clearTransactions: () => set({ transactions: [] }),

  // Enhanced local transaction methods with localStorage
  addLocalTransaction: (tx) => {
    const newTransaction: Transaction = {
      ...tx,
      id: tx.txHash,
      timestamp: Date.now(),
    };

    set(state => {
      const updatedLocalTransactions = [newTransaction, ...state.localTransactions];

      // Save to localStorage
      saveLocalTransactionsToStorage(updatedLocalTransactions);

      return {
        localTransactions: updatedLocalTransactions
      };
    });
  },

  removeLocalTransaction: (txHash) => {
    set(state => {
      const updatedLocalTransactions = state.localTransactions.filter(tx => tx.txHash !== txHash);

      // Update localStorage
      saveLocalTransactionsToStorage(updatedLocalTransactions);

      return {
        localTransactions: updatedLocalTransactions
      };
    });
  },

  loadLocalTransactions: () => {
    const localTransactions = loadLocalTransactionsFromStorage();
    set({ localTransactions });
  },

  clearLocalTransactions: () => {
    set({ localTransactions: [] });
    saveLocalTransactionsToStorage([]);
  },

  mergeTransactions: (apiTransactions) => {
    const { localTransactions } = get();

    // Filter out local transactions that are now in the API response
    const apiTxHashes = apiTransactions.map(tx => tx.txHash);
    const remainingLocalTxs = localTransactions.filter(tx => !apiTxHashes.includes(tx.txHash));

    // Merge and sort all transactions
    return [...apiTransactions, ...remainingLocalTxs].sort((a, b) => b.timestamp - a.timestamp);
  },

  fetchFeeEstimation: async (amount: number) => {
    if (amount == 0) {
      return;
    }

    try {
      set({ isLoadingFeeEstimation: true });
      const fee = await fetchFeeEstimation(amount);
      set(() => ({
        feeEstimation: {
          fee
        }
      }));
    } catch (error) {
      console.error(error);
    } finally {
      set({ isLoadingFeeEstimation: false });
    }

  },

  fetchDepositFeeEstimation: async (amount: number) => {
    if (amount == 0) return;

    // latest-wins gating
    // increment a local request counter and only commit if still the latest
    const g = get() as any;
    g.__depReqId = (g.__depReqId || 0) + 1;
    const reqId = g.__depReqId;
    
    try {
      set({ isLoadingFeeEstimation: true });
      const fee = await fetchDepositFeeEstimation(amount);
      // only commit if this is the latest request
      if ((get() as any).__depReqId === reqId){
       set( () => ({feeEstimation: {fee}}));       
      }
    } catch (error) {
      console.error(error);
    } finally {
      set({ isLoadingFeeEstimation: false });
    }
  },

  resetFeeEstimation: () => {
    set({ feeEstimation: null, isLoadingFeeEstimation: false });
  },
  
  fetchTransactions: async () => {
    const { bitcoinAddress, viaAddress } = get();

    if (!bitcoinAddress && !viaAddress) {
      return;
    }

    try {
      set({ isLoadingTransactions: true });
      const apiTransactions = await fetchUserTransactions(bitcoinAddress, viaAddress);
      const formattedTransactions = mapApiTransactionsToAppFormat(apiTransactions);

      // Use the mergeTransactions method to combine API and local transactions
      const mergedTransactions = get().mergeTransactions(formattedTransactions);

      set({ transactions: mergedTransactions });

      // Get transaction hashes that are now confirmed by the API
      const confirmedTxHashes = formattedTransactions.map(tx => tx.txHash);

      // Remove confirmed transactions from local storage and state
      if (confirmedTxHashes.length > 0) {
        removeTransactionsFromStorage(confirmedTxHashes);

        // Update local transactions state by removing confirmed ones
        set(state => ({
          localTransactions: state.localTransactions.filter(tx =>
            !confirmedTxHashes.includes(tx.txHash)
          )
        }));
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      set({ isLoadingTransactions: false });
    }
  },

  // Wallet operations
  connectXverse: async () => {
    try {
      console.log("🔹 Connecting to Xverse wallet...");

      const { request, RpcErrorCode, AddressPurpose } = await import("sats-connect");

      const response = await request("wallet_connect", {
        addresses: [AddressPurpose.Payment, AddressPurpose.Ordinals],
        message: "Connect to VIA Bridge app",
      });

      if (response.status !== "success") {
        if (response.error.code === RpcErrorCode.USER_REJECTION) {
          console.log("Connection rejected by user");
          return false;
        }
        throw new Error(`Connection failed: ${response.error.message || "Unknown error"}`);
      }

      const addresses = response.result.addresses;
      if (addresses.length === 0) {
        throw new Error("No addresses returned from wallet");
      }

      set({
        bitcoinAddress: addresses[0].address,
        bitcoinPublicKey: addresses[0].publicKey,
        isXverseConnected: true
      });

      // Check network after connection
      await get().checkXverseConnection();

      // Load local transactions after connecting
      get().loadLocalTransactions();

      console.log("✅ Xverse wallet connected, addresses:", addresses);
      walletEvents.xverseConnected.emit();
      return true;
    } catch (error) {
      console.error("Xverse connection error:", error);
      throw error;
    }
  },

  connectMetamask: async () => {
    try {
      console.log("🔹 Connecting to wallet...");
            
      const bestProvider = await getPreferredWeb3ProviderAsync();
      if (!bestProvider) {
        throw new Error("No wallet found. Please install MetaMask, Rabby, or another compatible wallet extension.");
      }

      console.log(`🔗 Using ${bestProvider.name} (${bestProvider.rdns})`);

      // Ensure selection reflects the chosen provider and emits walletChanged if changed
      get().setSelectedWallet(bestProvider.rdns);

      const accounts = await bestProvider.provider.request({
        method: "eth_requestAccounts",
      }) as string[];

      const address = accounts[0];
      set({
        viaAddress: address,
        isMetamaskConnected: true
      });

      // Check network after connection
      await get().checkMetamaskNetwork();

      // Load local transactions after connecting
      get().loadLocalTransactions();

      console.log("✅ MetaMask wallet connected, address:", address);
      walletEvents.metamaskConnected.emit();
      return true;
    } catch (error: any) {
      const USER_REJECTION_ERROR_CODE = 4001;
      if (error.code === USER_REJECTION_ERROR_CODE) {
        console.log("Connection rejected by user");
        return false;
      }
      console.error("Wallet connection error:", error);
      throw error;
    }
  },

  disconnectXverse: async () => {
    try {
      const { request } = await import("sats-connect");
      await request("wallet_disconnect", null);
    } catch (error) {
      console.error("Xverse disconnect error:", error);
    } finally {
      set({
        bitcoinAddress: null,
        bitcoinPublicKey: null,
        isXverseConnected: false,
        isCorrectBitcoinNetwork: false
      });
      walletEvents.xverseDisconnected.emit();
    }
  },

  disconnectMetamask: () => {
    set({
      viaAddress: null,
      isMetamaskConnected: false,
      isCorrectViaNetwork: false
    });
    walletEvents.metamaskDisconnected.emit();
  },

  switchNetwork: async (layer: Layer) => {
    try {
      const { isXverseConnected, isMetamaskConnected } = get();

      switch (layer) {
        case Layer.L1:
          if (isXverseConnected) {
            // Ask Xverse to switch to Bitcoin network via Sats connect
            const { request } = await import("sats-connect");
            const { BRIDGE_CONFIG } = await import("@/services/config");

            // Map env() network to display the name used by sats-connect
            const toXverseName = (net: string): string => {
              switch (net.toLowerCase()) {
                case "mainnet": return "Mainnet";
                case "testnet4": return "Testnet4";
                case "regtest": return "Regtest";
                default: return net;
              }
            };

            const targetName = toXverseName(BRIDGE_CONFIG.defaultNetwork);

            // Switch network using Sats Connect documented shape — docs: https://docs.xverse.app/sats-connect/wallet-methods/wallet_changenetwork
            const tryChangeNetwork = async (): Promise<boolean> => {
              try {
                const res: any = await request("wallet_changeNetwork", { name: targetName } as any);
                return res?.status === "success";
              } catch (e: any) {
                console.error("wallet_changeNetwork failed", e);
                return false;
              }
            };

            const switched = await tryChangeNetwork();
            if (switched) {
              await get().checkXverseConnection();
              walletEvents.networkChanged.emit();
              return true;
            }
          }
          break;
        case Layer.L2:
          if (isMetamaskConnected) {
            // For MetaMask, we can request a network switch
            const bestProvider = await getPreferredWeb3ProviderAsync();
            if (!bestProvider) {
              throw new Error("Wallet not found or not accessible");
            }
            const provider = bestProvider.provider;

            const { VIA_NETWORK_CONFIG, BRIDGE_CONFIG } = await import("@/services/config");
            const expectedChainId = VIA_NETWORK_CONFIG[BRIDGE_CONFIG.defaultNetwork].chainId;

            try {
              await provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: expectedChainId }],
              });
              set({ isCorrectViaNetwork: true });
              walletEvents.networkChanged.emit();
              return true;
            } catch (switchError: any) {
              // This error code indicates that the chain has not been added to the user wallet
              if (switchError.code === 4902) {
                await provider.request({
                  method: 'wallet_addEthereumChain',
                  params: [VIA_NETWORK_CONFIG[BRIDGE_CONFIG.defaultNetwork]],
                });
                set({ isCorrectViaNetwork: true });
                walletEvents.networkChanged.emit();
                return true;
              }
              throw switchError;
            }
          }
          break;
      }
    } catch (error) {
      console.error("Network switch error:", error);
    }

    walletEvents.networkChanged.emit();
  },

  connectWallet: async (rdns: string) => {
    try {
    console.log(`Connecting to wallet with rdns: ${rdns}`);
    const {eip6963Store} = await import("@/utils/eip6963-provider");
    const providerDetail = eip6963Store.getProviderByRdns(rdns);
    if (!providerDetail) throw new WalletNotFoundError(rdns);

    // Build a targeted wagmi injected connector for this provider
     const {injectedForProvider} = await import('@/lib/wagmi/connector');
     const connector = injectedForProvider(providerDetail);
 
    // connect via wagmi core using local config
     const {connect, switchChain, getAccount} = await import('@wagmi/core');
     const {wagmiConfig} = await import('@/lib/wagmi/config');
     const {VIA_NETWORK_CONFIG} = await import("@/services/config");
 
     // Derive the configured chain dynamically (supports ViaTestnet or ViaMainnet)
     const targetChainId = wagmiConfig.chains[0]?.id;
     if (!targetChainId) throw new Error('No chains configured in wagmiConfig');
 
     // await connect(wagmiConfig, {connector});
     // // Ensure we are on the configured VIA chain; ignore if already on correct chain
     // await switchChain(wagmiConfig, {chainId: targetChainId}).catch(() => {});
      await connect(wagmiConfig, {connector});
      // if the chain is not present, pass the EIP-3085 params so the waallet can add it
      let switchOk = true;
      try {
        const addParams = VIA_NETWORK_CONFIG[BRIDGE_CONFIG.defaultNetwork];
        await switchChain(wagmiConfig, {
          chainId: targetChainId,
          addEthereumChainParameter: {
            // prefer wagmi chain label. Fallback to config
            chainName: wagmiConfig.chains[0]?.name || addParams.chainName,
            nativeCurrency: addParams.nativeCurrency,
            rpcUrls: addParams.rpcUrls,
            blockExplorerUrls: addParams.blockExplorerUrls,
          },
        });
      } catch (err) {
        console.error('SwitchChain failed for injected provider (add/switch Via)', err);
        switchOk = false;
      }

    // Read the account and sync store
    const account = getAccount(wagmiConfig);
    const address = account?.address as string | undefined;

    set({
      viaAddress: address ?? null,
      isMetamaskConnected: !!address,
    });
    get().setSelectedWallet(rdns);

    // Already switched chain via wagmi, mark as correct
    set({isCorrectViaNetwork: switchOk});
    console.log(`Wallet ${providerDetail.info.name} connected address`, maskAddress(address || ''));
    walletEvents.metamaskConnected.emit();
    return !!address;
  } catch (error: any) {
    const USER_REJECTION_ERROR_CODE = 4001;
    if (error.code ==USER_REJECTION_ERROR_CODE) {
      console.log("Connection rejected by user");
      return false;
    }
    console.error(`Wallet connection error for ${rdns}:`, error);
    throw error;
  }
},

  refreshAvailableWallets: () => {
  try {
    console.log("🔄 Refreshing available wallets...");
    import("@/utils/eip6963-provider")
      .then(({ eip6963Store }) => {
        const providers = eip6963Store.getAllWalletProviders();
        // Normalize and sort by rdns
        const wallets = providers.map((provider: EIP6963ProviderDetail) => ({
          name: resolveDisplayName(provider),
          rdns: provider.info.rdns,
          icon: resolveIcon(provider),
        })).sort((a, b) => a.rdns.localeCompare(b.rdns));

        // skip update if nothing changed
        const prev = get().availableWallets;
        const same = prev.length === wallets.length && prev.every((w, i) =>
          w.rdns === wallets[i].rdns && w.name === wallets[i].name && w.icon === wallets[i].icon
        );
        if (same) return;

        set({ availableWallets: wallets });
        console.log(`✅ Found ${wallets.length} available wallets:`, wallets);
        walletEvents.walletRefreshed.emit();
      })
      .catch((error: any) => {
        console.error("Error refreshing available wallets:", error);
        // Don't throw, just log the error and continue with empty array
        set({ availableWallets: [] });
      });
    } catch (error: any) {
      console.error("Error refreshing available wallets:", error);
      // Don't throw, just log the error and continue with empty array
      set({ availableWallets: [] });
    }
  },

  // Helper methods
  checkXverseConnection: async () => {
    try {
      const { request, AddressPurpose } = await import("sats-connect");

      const res = await request('wallet_getNetwork', null) as any;
      if (res?.status !== "success") {
        set({ isXverseConnected: false });
        return;
      }

      // Check if connected to the correct network
      const { BRIDGE_CONFIG } = await import("@/services/config");
      const expectedNetwork = BRIDGE_CONFIG.defaultNetwork;
      // Xverse may report the test network as "Signet" while our config uses Testnet 4
      // Normalize both wallet responses and config
      const normalize = (name?: string): string => {
        const n = (name || "").toLowerCase();
        return n === "signet" ? "testnet4" : n;
      };
      const connectedNetwork = normalize(res.result?.bitcoin?.name);
      const isCorrect = normalize(expectedNetwork) === connectedNetwork;

      set({ isCorrectBitcoinNetwork: isCorrect });

      const response = await request("getAddresses", {
        purposes: [AddressPurpose.Payment],
      });

      if (response.status === "success") {
        const connectedPaymentAddress = response.result.addresses.find(
          (address) => address.purpose === AddressPurpose.Payment
        );

        if (connectedPaymentAddress) {
          set({
            bitcoinAddress: connectedPaymentAddress.address,
            bitcoinPublicKey: connectedPaymentAddress.publicKey,
            isXverseConnected: true
          });

          // Load local transactions when the wallet is already connected
          get().loadLocalTransactions();

          console.log("✅ Xverse wallet already connected");
        }
      }
    } catch (error) {
      console.log(`Error to check Xverse connection ${error}`);
      // Silently handle error - wallet is not connected
      set({ isXverseConnected: false });
    }
  },

  checkMetamaskNetwork: async () => {
    try {
      const bestProvider = await getPreferredWeb3ProviderAsync();
      if (!bestProvider) {
        console.warn("Wallet provider not found");
        return;
      }

      const { VIA_NETWORK_CONFIG, BRIDGE_CONFIG } = await import("@/services/config");
      const expectedChainId = VIA_NETWORK_CONFIG[BRIDGE_CONFIG.defaultNetwork].chainId;
      const chainId = await bestProvider.provider.request({ method: 'eth_chainId' });
      const isCorrect = chainId === expectedChainId;

      set({ isCorrectViaNetwork: isCorrect });

      if (!isCorrect) {
        try {
          await bestProvider.provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: expectedChainId }],
          });
          set({ isCorrectViaNetwork: true });
          return true;
        } catch (switchError: any) {
          // This error code indicates that the chain has not been added to the wallet
          if (switchError.code === 4902) {
            await bestProvider.provider.request({
              method: 'wallet_addEthereumChain',
              params: [VIA_NETWORK_CONFIG[BRIDGE_CONFIG.defaultNetwork]],
            });
            set({ isCorrectViaNetwork: true });
            return true;
          }
          throw switchError;
        }
      }
    } catch (error) {
      console.error("Error checking wallet network:", error);
    }
  }
}));
