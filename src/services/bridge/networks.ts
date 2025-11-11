import { NetworkInfo } from '@/services/bridge/types';
import { BitcoinNetwork } from '@/services/bitcoin/types';
import { ViaMainnet, ViaTestnet } from '@/lib/wagmi/chains';
import { BTC_NETWORK_NAMES } from '@/services/networks/bitcoin';

/**
 * All supported bridge networks
 * 
 * Registry of all blockchain networks that can participate in bridging operations.
 * Each network contains metadata including display names, chain IDs, and types.
 * 
 * **Available Networks:**
 * - `BITCOIN_MAINNET` - Bitcoin Layer 1 mainnet
 * - `BITCOIN_TESTNET4` - Bitcoin Layer 1 testnet (Testnet4)
 * - `VIA_MAINNET` - Via Network mainnet (EVM, Chain ID: 5223)
 * - `VIA_TESTNET` - Via Network testnet/Sepolia (EVM, Chain ID: 25223)
 * 
 * **Data Sources:**
 * - Bitcoin: Display names from {@link BTC_NETWORK_NAMES}
 * - Via: Chain data from {@link ViaMainnet} and {@link ViaTestnet} Wagmi chains
 * 
 * @example
 * ```typescript
 * // Access a specific network
 * const bitcoin = NETWORKS.BITCOIN_MAINNET;
 * console.log(bitcoin.displayName); // "Mainnet"
 * console.log(bitcoin.type); // "bitcoin"
 * ```
 * 
 * @example
 * ```typescript
 * // Get network details for UI display
 * const network = NETWORKS.VIA_MAINNET;
 * console.log(`${network.displayName} (Chain ID: ${network.chainId})`);
 * // "Via Network (Chain ID: 5223)"
 * ```
 * 
 * @example
 * ```typescript
 * // Check network type for EVM-specific logic
 * if (NETWORKS.VIA_MAINNET.type === 'evm') {
 *   const chainId = NETWORKS.VIA_MAINNET.chainId; // 5223
 *   await switchChain({ chainId });
 * }
 * ```
 * 
 * @see {@link NetworkInfo} for the network type definition
 */
export const NETWORKS: Record<string, NetworkInfo> = {
  BITCOIN_MAINNET: {
    id: 'bitcoin-mainnet',
    displayName: BTC_NETWORK_NAMES[BitcoinNetwork.MAINNET], // "Bitcoin Mainnet"
    type: 'bitcoin',
    //icon: '/bitcoin.svg', // TODO: Add icon file
  },
  BITCOIN_TESTNET4: {
    id: 'bitcoin-testnet4',
    displayName: BTC_NETWORK_NAMES[BitcoinNetwork.TESTNET], // "Bitcoin Testnet4"
    type: 'bitcoin',
    //icon: '/bitcoin-testnet.svg', // TODO: Add icon file
  },
  VIA_MAINNET: {
    id: 'via-mainnet',
    displayName: ViaMainnet.name,        // "Via Network"
    chainId: ViaMainnet.id,              // 5223 (0x1467)
    type: 'evm',
    //icon: '/via.svg', // TODO: Add icon file
  },
  VIA_TESTNET: {
    id: 'via-testnet',
    displayName: ViaTestnet.name,        // "Via Network Sepolia"
    chainId: ViaTestnet.id,              // 25223 (0x6287)
    type: 'evm',
    //icon: '/via-testnet.svg', // TODO: Add icon file
  },
};
