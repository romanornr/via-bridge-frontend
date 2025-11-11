import { TokenInfo } from '@/services/bridge/types';

/**
 * All supported bridge tokens
 * 
 * Registry of tokens that can be bridged between networks.
 * Each token contains metadata including symbol, name, decimals, and icon.
 * 
 * **Available Tokens: **
 * - `BTC` - Bitcoin (8 decimals)
 * 
 *
 * @example
 * ```typescript
 * // Access token metadata
 * const btc = TOKENS.BTC;
 * console.log(btc.symbol); // "BTC"
 * console.log(btc.decimals); // 8
 * ```
 * 
 * @example
 * ```typescript
 * // Use in amount formatting
 * const amount = 0.00123456;
 * const formatted = amount.toFixed(TOKENS.BTC.decimals);
 * console.log(formatted); // "0.00123456"
 * ```
 * 
 * @see {@link TokenInfo} for the token type definition
 */
export const TOKENS: Record<string, TokenInfo> = {
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    decimals: 8,
    icon: '/bitcoin.svg', // TODO: Add icon file
  },
  
  // TODO  uncomment when ready
  // USDC: {
  //   symbol: 'USDC',
  //   name: 'USD Coin',
  //   decimals: 6,
  //   icon: '/usdc.svg',
  //   contractAddress: '0x...', // Add per network
  // },
};
