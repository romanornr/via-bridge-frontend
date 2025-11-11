import { BitcoinNetwork } from "@/services/bitcoin/types";

/**
 * Bitcoin L1 network display names
 *
 * Single source of truth for Bitcoin network display names shown in the UI
 * Used in network configurations, approval modals, and other UI components
 *
 * Note: For Xverse wallet_changeNetwork API calls, use the toXverseName() 
 * function in wallet-store.tsx which maps these to the short names Xverse expects
 *
 * @example
 * const displayName = BTC_NETWORK_NAMES[BRIDGE_CONFIG.defaultNetwork];
 * // displayName = "Bitcoin Mainnet" | "Bitcoin Testnet4" | "Bitcoin Regtest"
 */
export const BTC_NETWORK_NAMES: Record<BitcoinNetwork, string> = {
  [BitcoinNetwork.MAINNET]: "Bitcoin Mainnet",
  [BitcoinNetwork.TESTNET]: "Bitcoin Testnet4",
  [BitcoinNetwork.REGTEST]: "Bitcoin Regtest",
} as const;
