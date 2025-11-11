import { BitcoinNetwork } from "@/services/bitcoin/types";
import { env } from "@/lib/env";
import {VIA_EVM_CHAIN_PARAMS, ViaNetwork} from "@/services/networks/evm";
export { VIA_EVM_CHAIN_PARAMS } from "@/services/networks/evm";
export { BTC_NETWORK_NAMES } from "@/services/networks/bitcoin";

// Define the API base URL
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://0.0.0.0:5050";
export const FEE_ESTIMATION_URL =
  process.env.NEXT_PUBLIC_FEE_ESTIMATION_URL ||
  `${API_BASE_URL}/fee-estimation`;

export enum Layer {
  L1,
  L2,
}

/**
 * Maps Bitcoin L1 network environment to the corresponding VIA network
 * Allowing the bridge to know which VIA EVM chain to use
 * based on the selected Bitcoin network environment. (NEXT_PUBLIC_NETWORK)
 *
 * @example
 * ```typescript
 * // Get VIA network for current BTC environment
 * const viaNetwork = BTC_ENV_TO_VIA_NETWORK[BRIDGE_CONFIG.defaultNetwork];
 * const evmParams = VIA_EVM_CHAIN_PARAMS[viaNetwork];
 * ```
 */
export const BTC_ENV_TO_VIA_NETWORK = {
  [BitcoinNetwork.MAINNET]: ViaNetwork.MAINNET,
  [BitcoinNetwork.TESTNET]: ViaNetwork.TESTNET,
  [BitcoinNetwork.REGTEST]: ViaNetwork.REGTEST,
};

// Backward compatibility. EVM params index by BTC env
export const VIA_NETWORK_CONFIG: Record<BitcoinNetwork, (typeof VIA_EVM_CHAIN_PARAMS)[ViaNetwork]> = {
  [BitcoinNetwork.MAINNET]: VIA_EVM_CHAIN_PARAMS[ViaNetwork.MAINNET],
  [BitcoinNetwork.TESTNET]: VIA_EVM_CHAIN_PARAMS[ViaNetwork.TESTNET],
  [BitcoinNetwork.REGTEST]: VIA_EVM_CHAIN_PARAMS[ViaNetwork.REGTEST],
} as const;

/**
 * Get VIA EVM network parameters for the currently configured environment
 *
 * @returns AddEthereumChainParameters object for wallet_addEthereumChain
 *
 * @example
 * ```typescript
 * // Get params for the current environment (from NEXT_PUBLIC_NETWORK)
 * const currentParams = getNetworkConfig();
 * // currentParams = AddEthereumChainParameters
 * //
 * // e.g., for TESTNET:
 * // {
 * //   chainId: "0x6287",
 * //   chainName: "Via Network Sepolia",
 * //   nativeCurrency: { name: "BTC", symbol: "BTC", decimals: 18 },
 * //   rpcUrls: ["https://via.testnet.viablockchain.dev"],
 * //   blockExplorerUrls: ["https://testnet.blockscout.onvia.org"],
 * // }
 * 
 * await provider.request({ method: 'wallet_addEthereumChain', params: [currentParams] });
 * ```
 */
export const getNetworkConfig = () => {
  return VIA_NETWORK_CONFIG[env().NEXT_PUBLIC_NETWORK];
};

/**
 * Get VIA EVM network param for a given BTC environment
 * Use when we need params for an environment other than the current NEXT_PUBLIC_NETWORK
 *
 * @param btcEnv - The Bitcoin network environment (MAINNET, TESTNET, or REGTEST)
 * @returns AddEthereumChainParameters object for wallet_addEthereumChain
 * @example
 * ```typescript
 * const params = getViaEVMParamsForBTCEnv(BitcoinNetwork.TESTNET);
 * await provider.request({ method: 'wallet_addEthereumChain', params: [params] });
 * ```
 */
export const getViaEVMParamsForBTCEnv = (btcEnv: BitcoinNetwork) => {
  return VIA_NETWORK_CONFIG[btcEnv];
};

export const API_CONFIG = {
  timeout: 30000, // 5 seconds timeout
  endpoints: {
    bitcoin: {
      primary: {
        [BitcoinNetwork.TESTNET]: "https://mempool.space/testnet4/api",
        [BitcoinNetwork.MAINNET]: "https://mempool.space/api",
        [BitcoinNetwork.REGTEST]: "https://mempool.space/testnet4/api",
      },
      fallback: {
        [BitcoinNetwork.TESTNET]: "https://mempool.space/testnet4/api",
        [BitcoinNetwork.MAINNET]: "https://mempool.space/api",
        [BitcoinNetwork.REGTEST]: "https://blockstream.info/testnet/api",
      },
      explorer: {
        [BitcoinNetwork.TESTNET]: "https://mempool.space/testnet4/tx/",
        [BitcoinNetwork.MAINNET]: "https://mempool.space/tx/",
        [BitcoinNetwork.REGTEST]: "http://localhost:1880/tx/",
      },
    },
  },
} as const;

/**
 * Bitcoin API endpoint for mempool space queries and transaction explorer
 * Contains primary and fallback URL endpoints for each Bitcoin network environment block explorer URLs for each network
 *
 * @example
 * ```typescript
 * // Fetch UTXOs from the primary endpoint
 * const response = await fetch(`${BTC_API.primary[BitcoinNetwork.TESTNET]}/address/${address}/utxo`);
 * 
 * // Open transaction in explorer
 * window.open(`${BTC_API.explorer[BitcoinNetwork.TESTNET]}${txHash}`);
 * ```
 */
export const BTC_API = API_CONFIG.endpoints.bitcoin;

export const BRIDGE_CONFIG = {
  // TODO: Add real bridge addresses
  addresses: {
    [BitcoinNetwork.REGTEST]: "bcrt1p3s7m76wp5seprjy4gdxuxrr8pjgd47q5s8lu9vefxmp0my2p4t9qh6s8kq",
    [BitcoinNetwork.TESTNET]: "tb1ppsy8j80jtns42rkpdsfcv25qfschqejxmk6datkvu236eekr4fms06wnz0",
    [BitcoinNetwork.MAINNET]: "",
  },
  maxPriorityFeeRate: 5, // Maximum acceptable fee rate in sats/vB
  defaultFee: 400, // Default fee in satoshis
  minBlockConfirmations: 0, // No confirmation required for chained deposits
  defaultNetwork: env().NEXT_PUBLIC_NETWORK,
  viaChainId: VIA_NETWORK_CONFIG[env().NEXT_PUBLIC_NETWORK].chainId,
} as const;
