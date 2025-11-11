import {BridgeRoute} from './types';
import {NETWORKS} from "@/services/bridge/networks";
import {TOKENS} from "@/services/bridge/tokens";
import {BRIDGE_CONFIG} from "@/services/config";
import {BitcoinNetwork} from '@/services/bitcoin/types';

/**
 * All supported bridge routes
 * 
 * Defines the available paths for bridging tokens between networks.
 * Each route specifies the source network, destination network, token, and direction.
 * 
 * **Route Types:**
 * - **Deposit**: Bitcoin → Via Network (locks BTC, mints on Via)
 * - **Withdraw**: Via Network → Bitcoin (burns on Via, unlocks BTC)
 * 
 * **Available Routes:**
 * - `bitcoin-mainnet-to-via-mainnet` - Deposit BTC from Bitcoin Mainnet to Via Mainnet (disabled)
 * - `bitcoin-testnet4-to-via-testnet` - Deposit BTC from Bitcoin Testnet4 to Via Testnet (enabled)
 * - `via-mainnet-to-bitcoin-mainnet` - Withdraw BTC from Via Mainnet to Bitcoin Mainnet (disabled)
 * - `via-testnet-to-bitcoin-testnet4` - Withdraw BTC from Via Testnet to Bitcoin Testnet4 (enabled)
 * 
 * **Data Sources: **
 * - Networks: {@link NETWORKS}
 * - Tokens: {@link TOKENS}
 * 
 * @example
 * ```typescript
 * // Find available deposit routes
 * const depositRoutes = BRIDGE_ROUTES.filter(r => r.direction === 'deposit' && r.enabled);
 * ```
 * 
 * @example
 * ```typescript
 * // Get route by ID
 * const route = BRIDGE_ROUTES.find(r => r.id === 'bitcoin-testnet4-to-via-testnet');
 * console.log(route?.fromNetwork.displayName); // "Testnet4"
 * console.log(route?.toNetwork.displayName); // "Via Network Sepolia"
 * ```
 * 
 * @example
 * ```typescript
 * // Check if a specific route is enabled
 * const isMainnetLive = BRIDGE_ROUTES
 *   .find(r => r.id === 'bitcoin-mainnet-to-via-mainnet')?.enabled;
 * ```
 * 
 * @see {@link BridgeRoute} for the route type definition
 * @see {@link NETWORKS} for network definitions
 * @see {@link TOKENS} for token definitions
 */
export const BRIDGE_ROUTES: BridgeRoute[] = [
  {
    id: 'bitcoin-mainnet-to-via-mainnet',
    fromNetwork: NETWORKS.BITCOIN_MAINNET,
    toNetwork: NETWORKS.VIA_MAINNET,
    token: TOKENS.BTC,
    direction: "deposit",
    enabled: false, // TODO enable when via network mainnet is live
    // TODO add estimated time and or min/max amount
},
  {
    id: 'bitcoin-testnet4-to-via-testnet',
    fromNetwork: NETWORKS.BITCOIN_TESTNET4,
    toNetwork: NETWORKS.VIA_TESTNET,
    token: TOKENS.BTC,
    direction: "deposit",
    enabled: true
    // TODO add estimated time and or min/max amount
  },
  {
    id: 'via-mainnet-to-bitcoin-mainnet',
    fromNetwork: NETWORKS.VIA_MAINNET,
    toNetwork: NETWORKS.BITCOIN_MAINNET,
    token: TOKENS.BTC,
    direction: "withdraw",
    enabled: false //  TODO enable when via network mainnet is live,
    // TODO add estimated time and or min/max amount
  },
  {
    id: 'via-testnet-to-bitcoin-testnet4',
    fromNetwork: NETWORKS.VIA_TESTNET,
    toNetwork: NETWORKS.BITCOIN_TESTNET4,
    token: TOKENS.BTC,
    direction: "withdraw",
    enabled: true,
  }
];

/**
 * Get the current route based on direction and environment
 */
export function GetCurrentRoute(direction: 'deposit' | 'withdraw', btcNetwork: BitcoinNetwork = BRIDGE_CONFIG.defaultNetwork) {
  const viaNetworkId = btcNetwork === BitcoinNetwork.MAINNET
  ? NETWORKS.VIA_MAINNET.id
  : NETWORKS.VIA_TESTNET.id;

  const btcNetworkId = btcNetwork === BitcoinNetwork.MAINNET
    ? NETWORKS.BITCOIN_MAINNET.id
    : NETWORKS.BITCOIN_TESTNET4.id;

  const routeId = direction === 'deposit' // TODO do this cleaner one day because ethereum network support is coming
    ? `${btcNetworkId}-to-${viaNetworkId}`
    : `${viaNetworkId}-to-${btcNetworkId}`;

  // Find the matching enabled route
  const route =  BRIDGE_ROUTES.find(r => r.id === routeId && r.enabled);

  if (!route) {
    throw new Error(`No enabled route found for ${direction}`);
  }

  return route;
}
