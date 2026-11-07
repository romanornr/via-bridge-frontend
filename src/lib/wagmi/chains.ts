import { mainnet as viemMainnet, sepolia as viemSepolia } from "viem/chains";
import { defineChain, type Chain } from 'viem';
import type { AddEthereumChainParameter } from 'viem';


export const ViaTestnet = defineChain({
  id: 25223, // 0x6287
  name: 'Via Network Sepolia',
  nativeCurrency: { name: 'BTC', symbol: 'BTC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.vianetwork.xyz'] },
    public: { http: ['https://rpc.testnet.vianetwork.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://explorer.testnet.vianetwork.xyz' },
  },
  testnet: true,
});

export const ViaMainnet = defineChain({
  id: 5223,  // 0x1467
  name: 'Via Network',
  nativeCurrency: { name: 'BTC', symbol: 'BTC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://via.viablockchain.dev'] }, // TODO update if needed
    public: { http: ['https://via.viablockchain.dev'] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://blockscout.onvia.org' },
  },
  testnet: false,
});

// Ethereum Sepolia - extend viem's build-in with custom RPC if needed
export const EthereumSepolia = defineChain({
  ...viemSepolia,
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/1uiSbDzdztbtMS63fthe6Hh_oYKUImtK'],
    }
  },
});

// Ethereum Mainnet - use viem's built-in chain directly
// Note: viemMainnet includes default public RPC URLs from Cloudflare, Ankr, etc.
export const EthereumMainnet = viemMainnet;

/**
 * Lookup helper used by UI/services that only have numeric chainId.
 * Keep this list in sync with exported chains
 */
const CHAIN_MAP = new Map<number, Chain>([
  [ViaTestnet.id, ViaTestnet],
  [ViaMainnet.id, ViaMainnet],
  [EthereumSepolia.id, EthereumSepolia],
  [EthereumMainnet.id, EthereumMainnet],
]);

export function getViemChainById(chainId: number): Chain | undefined {
  return CHAIN_MAP.get(chainId);
}

/**
 * Converts a viem Chain definition into EIP-3085 addEthereumChain parameters.
 * These params can be passed to wagmi's switchChain({ addEthereumChainParameter }).
 */
export function chainToAddEthereumChainParameters(
  chain: Chain
): AddEthereumChainParameter {
  return {
    chainId: `0x${chain.id.toString(16)}`,
    chainName: chain.name,
    nativeCurrency: chain.nativeCurrency,
    rpcUrls: chain.rpcUrls.default.http,
    blockExplorerUrls: chain.blockExplorers?.default
      ? [chain.blockExplorers.default.url]
      : [],
  };
}

/**
 * Convenience function to get EIP-3085 parameters directly from a chain ID.
 * Combines getViemChainById and chainToAddEthereumChainParameters.
 *
 * @param chainId - Numeric chain ID (e.g., 11155111 for Sepolia)
 * @returns EIP-3085 parameters for wallet_addEthereumChain, or undefined if chain not found
 *
 * @example
 * const params = getAddChainParams(11155111);
 * if (params) {
 *   await provider.request({ method: 'wallet_addEthereumChain', params: [params] });
 * }
 */
export function getAddChainParams(
  chainId: number
): AddEthereumChainParameter | undefined {
  if (!Number.isInteger(chainId) || chainId <= 0) return undefined;
  const chain = getViemChainById(chainId);
  return chain && chainToAddEthereumChainParameters(chain);
}
