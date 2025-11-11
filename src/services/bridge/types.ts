/**
 * Bridge Route Types
 * 
 * These types define the structure of bridge routes in the application.
 * They support bridging assets between different blockchain networks
 * (Bitcoin, Ethereum, Via Network, etc.).
 */

/**
 * Represents a blockchain network in the bridge system
 * 
 * Supports both Bitcoin networks and EVM-compatible chains.
 * Each network has metadata for display, identification, and routing.
 * 
 * @example
 * ```TypeScript
 * // Bitcoin network
 * const bitcoin: NetworkInfo = {
 *   id: 'bitcoin-mainnet',
 *   displayName: 'Bitcoin',
 *   type: 'bitcoin',
 *   icon: '/icons/bitcoin.svg',
 * };
 * 
 * // EVM network (Via)
 * const via: NetworkInfo = {
 *   id: 'via-mainnet',
 *   displayName: 'Via Network',
 *   chainId: 5223,
 *   type: 'evm',
 *   icon: '/icons/via.svg',
 * };
 * ```
 */
export type NetworkInfo = {
  /** Unique identifier (e.g., 'bitcoin-mainnet', 'ethereum-mainnet', 'via-mainnet') */
  id: string;

  /** Display name shown to users (e.g., 'Bitcoin', 'Ethereum', 'Via Network') */
  displayName: string;

  /** Chain ID for EVM networks (e.g., 1 for Ethereum, 5223 for Via Mainnet, undefined for Bitcoin) */
  chainId?: number;

  /** Icon path or identifier (e.g., '/icons/bitcoin.svg', 'bitcoin') */
  icon?: string;

  /** Network type: 'bitcoin' for Bitcoin, 'evm' for EVM-compatible chains */
  type: 'bitcoin' | 'evm';
};

/**
 * Represents a bridgeable asset (native currency or token)
 * 
 * Note: We use "token" as a general term for any transferable asset, including native cryptocurrencies like BTC and ETH
 *
 * @example
 * ```TypeScript
 * // Native asset (Bitcoin)
 * const btc: TokenInfo = {
 *   symbol: 'BTC',
 *   name: 'Bitcoin',
 *   decimals: 8,
 *   icon: '/icons/bitcoin.svg',
 * };
 * 
 * // ERC-20 token (USDC)
 * const usdc: TokenInfo = {
 *   symbol: 'USDC',
 *   name: 'USD Coin',
 *   decimals: 6,
 *   icon: '/icons/usdc.svg',
 *   contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
 * };
 * ```
 */
export type TokenInfo = {
  /** Token symbol (e.g., 'BTC', 'USDC', 'ETH') */
  symbol: string;

  /** Full token name (e.g., 'Bitcoin', 'USD Coin', 'Ether') */
  name: string;

  /** Number of decimals (e.g., 8 for BTC, 18 for ETH, 6 for USDC) */
  decimals: number;

  /** Icon path or identifier (e.g., '/icons/bitcoin.svg', 'bitcoin') */
  icon?: string;

  /** 
   * ERC-20 contract address (undefined for native assets)
   * @example '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' (USDC on Ethereum)
   */
  contractAddress?: string;
};

/**
 * Represents a complete bridge route between two networks
 * 
 * A route defines how a specific asset can be bridged from one network to another.
 * Routes can be enabled/disabled to control which bridging operations are available to users.
 * 
 * @example
 * ```TypeScript
 * // BTC deposit from Bitcoin to Via Network
 * const btcDeposit: BridgeRoute = {
 *   id: 'bitcoin-mainnet-to-via-mainnet',
 *   fromNetwork: NETWORKS.BITCOIN_MAINNET,
 *   toNetwork: NETWORKS.VIA_MAINNET,
 *   token: TOKENS.BTC,
 *   direction: 'deposit',
 *   enabled: true,
 *   minAmount: '0.00002',
 *   maxAmount: '10.0',
 *   estimatedTime: '15-30 minutes',
 * };
 * 
 * // USDC deposit from Ethereum to Via Network (future)
 * const usdcDeposit: BridgeRoute = {
 *   id: 'usdc-ethereum-to-via-mainnet',
 *   fromNetwork: NETWORKS.ETHEREUM_MAINNET,
 *   toNetwork: NETWORKS.VIA_MAINNET,
 *   token: TOKENS.USDC,
 *   direction: 'deposit',
 *   enabled: false,
 *   minAmount: '10',
 *   estimatedTime: '5-10 minutes',
 * };
 * ```
 */
export type BridgeRoute = {
  /** Unique route identifier (e.g., 'bitcoin-mainnet-to-via-mainnet', 'usdc-ethereum-to-via-mainnet') */
  id: string;

  /** Source network where the asset originates */
  fromNetwork: NetworkInfo;

  /** Destination network where the asset will be received */
  toNetwork: NetworkInfo;

  /** Token/asset being bridged */
  token: TokenInfo;

  /** Bridge direction: 'deposit' (L1→L2) or 'withdraw' (L2→L1) */
  direction: 'deposit' | 'withdraw';

  /** Whether this route is currently active and available to users */
  enabled: boolean;

  /** 
   * Minimum amount in token's display units (e.g., '0.00002' for BTC, '10' for USDC)
   * Uses string to avoid floating-point precision issues
   */
  minAmount?: string;

  /** 
   * Maximum amount in token's display units (e.g., '10.0' for BTC, '100000' for USDC)
   * Uses string to avoid floating-point precision issues
   */
  maxAmount?: string;

  /** 
   * Estimated completion time (e.g., '15-30 minutes', '5-10 minutes')
   * Based on network confirmation times and bridge processing
   */
  estimatedTime?: string;
};

/**
 * Route lookup key for finding specific routes
 * 
 * Used to query routes by their characteristics rather than by ID.
 * Useful for finding routes that match specific criteria like the direction, networks, and token.
 * 
 * @example
 * ```typescript
 * // Create a lookup key
 * const key: RouteKey = {
 *   direction: 'deposit',
 *   fromNetworkId: 'bitcoin-mainnet',
 *   toNetworkId: 'via-mainnet',
 *   tokenSymbol: 'BTC',
 * };
 *
 * // Find matching route
 * const route = ROUTES.find(r =>
 *   r.direction === key.direction &&
 *   r.fromNetwork.id === key.fromNetworkId &&
 *   r.toNetwork.id === key.toNetworkId &&
 *   r.token.symbol === key.tokenSymbol
 * );
 * // route = BridgeRoute | undefined
 * //
 * // If found, route will be:
 * // {
 * //   id: 'bitcoin-mainnet-to-via-mainnet',
 * //   fromNetwork: { id: 'bitcoin-mainnet', displayName: 'Bitcoin', ... },
 * //   toNetwork: { id: 'via-mainnet', displayName: 'Via Network', ... },
 * //   token: { symbol: 'BTC', name: 'Bitcoin', decimals: 8, ... },
 * //   direction: 'deposit',
 * //   enabled: true,
 * //   minAmount: '0.00002',
 * //   maxAmount: '10.0',
 * //   estimatedTime: '15-30 minutes',
 * // }
 * ```
 */
export type RouteKey = {
  /** Bridge direction: 'deposit' or 'withdraw' */
  direction: 'deposit' | 'withdraw';

  /** Source network ID (e.g., 'bitcoin-mainnet', 'ethereum-mainnet') */
  fromNetworkId: string;

  /** Destination network ID (e.g., 'via-mainnet', 'bitcoin-mainnet') */
  toNetworkId: string;

  /** Token symbol (e.g., 'BTC', 'USDC', 'ETH') */
  tokenSymbol: string;
};
