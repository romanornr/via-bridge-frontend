import { BitcoinNetwork } from "@/services/bitcoin/types";

/**
 * Bitcoin L1 network names for Xverse Sats Connect wallet_changeNetwork
 *
 * Single source of truth - replaces inline network name mappings
 * Used when switching Bitcoin networks in Xverse wallet
 *
 * @example
 * const targetName = BTC_NETWORK_NAMES[BRIDGE_CONFIG.defaultNetwork];
 * await request({ method: 'wallet_changeNetwork', params: [(name: targetName]}
 */
export const BTC_NETWORK_NAMES: Record<BitcoinNetwork, string> = {
  [BitcoinNetwork.MAINNET]: "Mainnet",
  [BitcoinNetwork.TESTNET]: "Testnet4",
  [BitcoinNetwork.REGTEST]: "Regtest",
} as const;
