import type { Connector } from '@wagmi/core';

/**
 * Adds and switches to a specified chain network using a configured provider in a user wallet.
 * This function works to ensure the target network is available and active via EIP-3085 and EIP-3326 standards.
 * This bypasses wagmi's switchChain when it fails (e.g., Rabby's SwitchChainNotSupportedError).
 *
 * @param {Connector} [connector] - Optional wagmi connector object providing access to a provider for blockchain interaction. If not provided, attempts to use the default active connection.
 * @return {Promise<boolean>} A promise that resolves to `true` if the chain was successfully added and switched to, or `false` otherwise.
 */
export async function addAndSwitchToViaChain(connector?: Connector): Promise<boolean> {
  try {
    const { BRIDGE_CONFIG, VIA_NETWORK_CONFIG } = await import('@/services/config');
    const { wagmiConfig } = await import('@/lib/wagmi/config');
    const { getConnections, getAccount } = await import('@wagmi/core');

    const chainConfig = VIA_NETWORK_CONFIG[BRIDGE_CONFIG.defaultNetwork];

    // Filter to HTTPS RPCs only for WalletConnect/mobile wallet compatibility. Mobile wallets reject http:// endpoints
    const httpsRpcUrls = chainConfig.rpcUrls.filter((url) => url.startsWith('https://'));

    // Build EIP-3085 parameters
    const addChainParams = {
      chainId: chainConfig.chainId,
      chainName: chainConfig.chainName,
      nativeCurrency: chainConfig.nativeCurrency,
      rpcUrls: httpsRpcUrls.length > 0 ? httpsRpcUrls : chainConfig.rpcUrls,
      blockExplorerUrls: chainConfig.blockExplorerUrls,
    };

    // Resolve provider in this order: connector arg -> getAccount().connector -> first active connection
    let provider: any | undefined;
    let resolved: 'arg' | 'account' | 'first' | 'none' = 'none';

    if (connector?.getProvider) {
      provider = await connector.getProvider();
      resolved = 'arg';
    }

    if (!provider?.request) {
      const account = getAccount(wagmiConfig);
      const accountConnector = account?.connector as any;
      if (accountConnector?.getProvider) {
        provider = await accountConnector.getProvider();
        resolved = 'account';
      }
    }

    if (!provider?.request) {
      const connections = getConnections(wagmiConfig);
      const firstConnector = connections[0]?.connector as any;
      if (firstConnector?.getProvider) {
        provider = await firstConnector.getProvider();
        resolved = 'first';
      }
    }

    if (!provider?.request) {
      console.warn('addAndSwitchToViaChain: No provider found');
      return false;
    }
    console.debug('addAndSwitchToViaChain: provider resolved via', resolved);

    // Try to switch to the Via Network chain (might already be on it)
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: addChainParams.chainId }],
      });
      console.log('Successfully switched to Via Network chain');
      return true;
    } catch (switchError: any) {
      console.log('Via Network chain not found. Attempting to add:', switchError.code);
    }

    // Add the Via Network chain via EIP-3085
    try {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [addChainParams],
      });
      console.log('Successfully added Via Network chain');
    } catch (addError: any) {
      if (addError.code === 4001) {
        console.log('User rejected adding Via Network chain');
        return false;
      }
      console.error('Failed to add Via Network chain', addError);
      return false;
    }

    // Switch to the newly added chain
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: addChainParams.chainId }],
      });
      console.log('Successfully switched to Via Network chain');
      return true;
    } catch (finalSwitchError: any) {
      console.error('Failed to switch to Via Network chain after adding', finalSwitchError);
      return false;
    }
  } catch (error) {
    console.error('addAndSwitchToViaChain: unexpected error:', error);
    return false;
  }
}
