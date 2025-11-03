import { createConfig, http, type Config } from 'wagmi';
import { ViaTestnet, ViaMainnet } from '@/lib/wagmi/chains';
import { BRIDGE_CONFIG } from '@/services/config';
import { BitcoinNetwork } from '@/services/bitcoin/types';

// Use exactly one chain based on app configuration
const isMainnet = BRIDGE_CONFIG.defaultNetwork === BitcoinNetwork.MAINNET;

// Build config in two branches to satisfy wagmi v2 generics.
// Each branch provides a readonly tuple of chains and transport for that exact chain id.
export const wagmiConfig: Config = isMainnet
  ? createConfig({
      chains: [ViaMainnet] as const,
      transports: {
        [ViaMainnet.id]: http(),
      },
      connectors: [], // construct targeted injected connectors at connect time
      multiInjectedProviderDiscovery: false, // we manage providers via EIP-6963 + targeted connectors
    })
  : createConfig({
      chains: [ViaTestnet] as const,
      transports: {
        [ViaTestnet.id]: http(),
      },
      connectors: [], // construct targeted injected connectors at connect time
      multiInjectedProviderDiscovery: false, // we manage providers via EIP-6963 + targeted connectors
    });
