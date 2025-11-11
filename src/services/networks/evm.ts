import { ViaMainnet, ViaTestnet } from '@/lib/wagmi/chains';

/**
 * VIA EVM Network identities
 *
 * Treats VIA as its own L2 Network (Like zkSync, Base, Arbitrum, etc.) separate from Bitcoin L1 Network
 * Mapped to Bitcoin environments via BTC_ENV_TO_VIA_NETWORK
 */
export enum ViaNetwork {
  MAINNET = "via-mainnet",
  TESTNET = "via-testnet",
  REGTEST = "via-regtest",
}

/**
 * EIP-3085 standard parameters for wallet_addEthereumChain.
 *
 * This shape is required for EVM wallets (Metamask, Rabby wallet, Rainbow, WalletConnect, etc.) to add a VIA network.
 * when requesting to add or switch to a custom network.
 */
export type AddEthereumChainParameters = {
  chainId: string,
  chainName: string,
  nativeCurrency: {
    name: string,
    symbol: string,
    decimals: number
  },
  rpcUrls: string[],
  blockExplorerUrls: string[],
}

/**
 * VIA EVM network configurations for adding/switching chains in EVM wallets.
 *
 * Generated from Wagmi chain definitions (ViaTestnet, ViaMainnet) to ensure consistency
 * across the application. REGTEST remains custom for local development.
 *
 * Used by wagmi/EIP-1193 providers (Metamask, Rabby wallet, Rainbow, WalletConnect, etc.) to add/switch to VIA networks.
 *
 * @example
 * /Add VIA testnet to wallet
 * const params = VIA_EVM_CHAIN_PARAMS[ViaNetwork.TESTNET];
 * await provider.request({ method: 'wallet_addEthereumChain', params: [params] });
 */
export const VIA_EVM_CHAIN_PARAMS: Record<ViaNetwork, AddEthereumChainParameters> = {
  [ViaNetwork.TESTNET]: {
    chainId: `0x${ViaTestnet.id.toString(16)}`,
    chainName: ViaTestnet.name,
    nativeCurrency: ViaTestnet.nativeCurrency,
    rpcUrls: [...ViaTestnet.rpcUrls.default.http],
    blockExplorerUrls: [ViaTestnet.blockExplorers.default.url],
  },
  [ViaNetwork.MAINNET]: {
    chainId: `0x${ViaMainnet.id.toString(16)}`,
    chainName: ViaMainnet.name,
    nativeCurrency: ViaMainnet.nativeCurrency,
    rpcUrls: [...ViaMainnet.rpcUrls.default.http],
    blockExplorerUrls: [ViaMainnet.blockExplorers.default.url],
  },
  // REGTEST remains custom for local development
  [ViaNetwork.REGTEST]: {
    chainId: "0x6287",
    chainName: "VIA Network",
    nativeCurrency: { name: "BTC", symbol: "BTC", decimals: 18 },
    rpcUrls: ["http://0.0.0.0:3050"],
    blockExplorerUrls: ["http://0.0.0.0:4000"],
  },
} as const;
