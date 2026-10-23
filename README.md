# VIA Bridge Frontend

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Overview

This application allows users to:
- Perform deposits from Bitcoin to VIA network:
  - Connect with Xverse wallet,
  - Initiate, sign and broadcast a deposit transaction on Bitcoin network, that will include 3 outputs:
    - Output 1: Required amount of BTC is sent from the user's account to the VIA bridge address,
    - Output 2: OP_RETURN output that contains l2 (EVM) address for receiving funds on VIA L2,
    - Output 3: Change amount sent back to the user's wallet.
- Perform withdrawals from VIA network to Bitcoin network:
  - Connect with MetaMask
  - Initiate withdrawal transaction on VIA network

## Getting Started

### Prerequisites

- Node.js 24 LTS (Next.js 16 requires 20.9 or newer)
- npm, yarn, pnpm, or bun
- MetaMask browser extension (for VIA network interactions)
- Xverse wallet (for Bitcoin interactions)

### Environment Setup

1. Copy the environment template:
```bash
cp example.env .env.local
```

2. Configure your environment variables:
```bash
# Set network (testnet4 for development, mainnet for production)
NEXT_PUBLIC_NETWORK=testnet4
```

### MetaMask Network Configuration

To use the VIA Bridge, you need to add the VIA network to your MetaMask wallet:

#### VIA Alpha Testnet (Development)

| Parameter | Value |
|-----------|-------|
| **Network Name** | VIA Alpha Testnet |
| **Chain ID** | 25223 |
| **RPC URL** | https://via.testnet.viablockchain.dev |
| **Base Token** | BTC |
| **Decimals** | 18 |
| **Block Explorer** | - |

#### How to Add Network to MetaMask

1. Open MetaMask and click on the network dropdown (top center)
2. Click "Add Network" or "Custom RPC"
3. Fill in the network details from the table above
4. Click "Save" to add the network
5. Switch to VIA network

### Development

Run the development server with Turbopack:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Or run without Turbopack if you encounter issues:
```bash
npm run dev:no-turbo
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
May use a different port if port 3000 is not available.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

### Production Build

```bash
npm run build
npm start
```

## Architecture

### Key Components

- **Wallet Store** (`src/store/wallet-store.tsx`): Centralized wallet state management
- **Ethereum Provider Utils** (`src/utils/ethereum-provider.ts`): Safe provider detection and conflict resolution
- **Wallet State Hook** (`src/hooks/use-wallet-state.tsx`): React hook for wallet interactions
- **Bridge Interface** (`src/components/bridge-interface.tsx`): Main UI component

### Security Features

- Provider conflict detection and resolution
- Network validation and automatic switching
- Production-safe error handling
- Security headers in production

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions including:
- Environment configuration
- Docker setup
- Platform-specific guides (Vercel, Netlify, etc.)
- Security considerations

## Troubleshooting

### Common Issues

1. **Multiple Wallet Providers**: The app automatically handles conflicts between MetaMask, Xverse, and other wallet extensions
2. **Network Mismatch**: Ensure your MetaMask is connected to VIA network. The app will prompt you to switch if needed.
3. **MetaMask Network Not Found**: If MetaMask can't find the VIA network, manually add it using the configuration table above
4. **Connection Issues**: Try refreshing the page or reconnecting your wallet
5. **Deposit/Withdrawal Failures**: Ensure you have sufficient BTC balance and are connected to the correct networks

### Debug Mode

Development builds include detailed logging. For production debugging:
```bash
NODE_ENV=development npm start
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [VIA official website](https://buildonvia.org)
- [VIA Documentation](https://docs.onvia.org)
- [MetaMask Documentation](https://docs.metamask.io)
- [Xverse Documentation](https://docs.xverse.app)
