import { defineChain } from 'viem';

export const ViaTestnet = defineChain({
  id: 25223, // 0x6287
  name: 'Via Network Sepolia',
  nativeCurrency: { name: 'BTC', symbol: 'BTC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://via.testnet.viablockchain.dev'] },
    public: { http: ['https://via.testnet.viablockchain.dev'] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://testnet.blockscout.onvia.org' },
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
