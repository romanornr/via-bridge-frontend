// Display metadata for unknown wallets
// This avoids per-wallet string matching and normalizes display

export type WalletBrand = 'MetaMask' | 'Rabby' | 'Coinbase' | 'WalletConnect'| 'Unknown';

export interface WalletDisplayMeta {
  rdns: string;
  name: string;
  brand: WalletBrand;
  iconPath?: string;
  installUrl?: string;
}

/**
 * Known RDNS values for EIP-6963 wallets and their canonical display metadata.
 * Note: Icons listed here should exist under /public
 * We ship MetaMask. Others default to provider-supplied icon
 */
export const WALLET_METADATA_BY_RDNS: Record<string,
  WalletDisplayMeta> = {
    'io.metamask': {
      rdns: 'io.metamask',
      name: 'MetaMask',
      brand: 'MetaMask',
      iconPath: '/metamask-logo.svg',
      installUrl: 'https://metamask.io/',
    },
    'io.rabby': {
      rdns: 'io.rabby',
      name: 'Rabby',
      brand: 'Rabby',
      // iconPath omitted; use provider.info.icon
      installUrl: 'https://rabby.io/',
    },
  'com.coinbase.wallet': {
      rdns: 'com.coinbase.wallet',
    name: 'Coinbase Wallet',
    brand: 'Coinbase',
    iconPath: '/coinbase-logo.svg',
    installUrl: 'https://www.coinbase.com/wallet/downloads',
  }
};

/**
 * Normalize RDNS for lookup (lowercase)
 */
export function normalizeRdns(rdns?: string): string | undefined {
  return typeof rdns === 'string' ? rdns.toLowerCase() : undefined;
}

/**
 * Lookup stable display metadata by RDNS
 */
export function getWalletDisplayMetaByRdns(rdns?: string): WalletDisplayMeta | undefined {
  const key = normalizeRdns(rdns);
  if (!key) return undefined;
  return WALLET_METADATA_BY_RDNS[key];
}

/**
 * Alias matching reference docs: getWalletMetadataByRdns()
 */
export function getWalletMetadataByRdns(rdns?: string): WalletDisplayMeta | undefined {
  return getWalletDisplayMetaByRdns(rdns);
}

/**
 * Resolve a display name for a provider using the stable dictionary
 * falling back to the provider's advertised name
 */
export function resolveDisplayName(provider: EIP6963ProviderDetail): string {
  const meta = getWalletDisplayMetaByRdns(provider.info.rdns);
  return meta?.name ?? provider.info.name;
}

/**
 * Resolve an icon path/URL for a provider
 * - Prefer our bundled iconPath for known wallets
 * - Otherwise use provider.info.icon
 */
export function resolveIcon(provider: EIP6963ProviderDetail): string | undefined {
  const meta = getWalletDisplayMetaByRdns(provider.info.rdns);
  return meta?.iconPath ?? provider.info.icon;
}

/**
 * Resolve brand string for a provider using the stable dictionary
 * falling back to 'Unknown'
 */
export function resolveBrand(provider: EIP6963ProviderDetail): WalletBrand {
  const meta = getWalletDisplayMetaByRdns(provider.info.rdns);
  return meta?.brand ?? 'Unknown';
}