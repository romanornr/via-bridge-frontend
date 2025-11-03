import { walletConnect } from 'wagmi/connectors';

type WalletConnectOpts = {
  projectId: string
  metadata?: {
    name: string
    description?: string
    url: string
    icons: string[]
  }
  showQrModal?: boolean
  isNewChainsStale?: boolean
  customStoragePrefix?: string
}

export function walletConnectForQR({
  projectId,
  metadata = {
    name: 'VIA Bridge',
    description: 'Bridge assets securely to the VIA network',
    // Check if `typeof window` because code can run on the server
    url: typeof window !== 'undefined' ? window.location.origin : 'https://testnet.bridge.onvia.org',
    icons: [],
  },
  showQrModal = true,
  // If adding Via Mainnet later, you can force a new session so users see new chains.
  // isNewChainsStale = true forces a fresh session (user rescans QR).
  isNewChainsStale = true,
  // Prevent conflicts if the user visits multiple WalletConnect dapps
  customStoragePrefix = 'via',
}: WalletConnectOpts) {
  // Ensure required metadata shape for WalletConnect (icons must be string[])
  const safeMetadata = {
    name: metadata.name,
    description: metadata.description ?? '',
    url: metadata.url,
    icons: Array.isArray(metadata.icons) ? metadata.icons : [],
  };

  return walletConnect({
    projectId,
    metadata: safeMetadata,
    showQrModal,
    isNewChainsStale,
    customStoragePrefix,
  });
}
