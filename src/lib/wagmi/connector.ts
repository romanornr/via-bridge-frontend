import { injected } from 'wagmi/connectors';
import { resolveDisplayName } from '@/utils/wallet-metadata';

/**
 * Create a Wagmi "injected" connector targeting a specific EIP-6963 provider.
 * We cast the provider to `any` to satisfy Wagmi's Target typing across wallets.
 */
export function injectedForProvider(detail: EIP6963ProviderDetail) {
  const name = resolveDisplayName(detail);
  return injected({
    target() {
      return {
        id: detail.info.rdns,
        name,
        // Wagmi Target typing expects a richer provider shape; cast to any here.
        provider: detail.provider as any,
      };
    },
    // Store manages connection state; do not use shimDisconnect.
    shimDisconnect: false,
  });
}
