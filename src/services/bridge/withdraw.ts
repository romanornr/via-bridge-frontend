import { toast } from "sonner";
import { BrowserProvider, Provider, Signer } from "via-ethers";
import { ethers } from "ethers";
import { L2_BTC_DECIMALS } from "../constants";
import { getNetworkConfig } from "../config";
import {getPreferredWeb3ProviderAsync} from "@/utils/ethereum-provider";
import { useWalletStore } from "@/store/wallet-store";
import {eip6963Store} from "@/utils/eip6963-provider";
import { withTimeout } from "@/utils/promise";

const CONNECT_TIMEOUT_MS = 10000; // 10-second timeout
const BALANCE_TIMEOUT_MS = 5000; // 5-second timeout
const SIGN_TIMEOUT_MS = 20000;  // 20-second timeout

export interface WithdrawParams {
  amount: string;
  recipientBitcoinAddress: string;
}

export interface WithdrawResult {
  txHash: string;
  explorerUrl: string;
}

/**
 * Executes a withdrawal transaction to a specified recipient Bitcoin address using the configured wallet.
 * This function ensures the wallet is connected, verifies balances, checks the network, and signs the transaction.
 *
 *  1) Resolve an EIP-1193 provider from wagmi's active connector (WalletConnect or injected)
 *  2) Handshake & select account. Bind signer to that account (getSigner(signerAddr))
 *  3) Verify chain (VIA) via eth_chainId and expected config. Optionally switch
 *  4) Check balance; sign & submit via-ethers Signer (wallet signs, RPC reads use on-chain Provider)
 *  5) Return txHash and explorer URL derived from config
 *
 * @param {WithdrawParams} params - The parameters required to execute the withdrawal.
 * @param {string} params.amount - The amount to withdraw in BTC (as a string for precision purposes).
 * @param {string} params.recipientBitcoinAddress - The recipient's Bitcoin address for the withdrawal.
 * @return {Promise<WithdrawResult>} A promise that resolves to the withdrawal result, including the transaction hash and an explorer URL.
 * @throws {Error} Throws an error if the wallet connection fails, the network is incorrect, or the signing process is rejected or fails.
 */
export async function executeWithdraw(params: WithdrawParams): Promise<WithdrawResult> {
  try {
    const { selectedWallet, viaAddress } = useWalletStore.getState();
    // Prefer active wagmi connector and fallback to EIP-6963 provider
    let providerApi: EIP1193Provider | null = null;
    try {
      const { getAccount, getConnections } = await import("@wagmi/core");
      const { wagmiConfig } = await import("@/lib/wagmi/config");
      const { connector } = getAccount(wagmiConfig) as any;
      const connections = getConnections(wagmiConfig);
      const activeConnector = connector ?? connections[0]?.connector;
      if (activeConnector?.getProvider) {
        providerApi = await activeConnector.getProvider();
      }
    } catch {}

    if (!providerApi) {
      let injected: { provider: EIP1193Provider; name: string; rdns: string} | null = null;
      if (selectedWallet) {
        const detail = eip6963Store.getProviderByRdns(selectedWallet);
        if (detail) injected = { provider: detail.provider, name: detail.info.name, rdns: detail.info.rdns };
      }
      if (!injected) injected = await getPreferredWeb3ProviderAsync(CONNECT_TIMEOUT_MS);
      if (injected) providerApi = injected.provider;

      if (!providerApi) {
        const msg = "No EVM wallet found. Please install a compatible wallet or connect via WalletConnect.";
        toast.error(msg, {description: msg,});
        throw new Error(msg);
      }
    }

    const browserProvider = new BrowserProvider(providerApi as any);
    const provider = new Provider(getNetworkConfig().rpcUrls[0]);

    // Handshake:
    // 1) Probe existing accounts (eth_accounts, no popup).
    // 2) If none, prompt user (eth_requestAccounts) with a timeout to avoid freezing the UI.
    let accounts = (await providerApi.request({ method: "eth_accounts" }).catch(() => [])) as string[];
    if (!accounts || accounts.length === 0) {
      accounts = await withTimeout(
        providerApi.request({ method: "eth_requestAccounts" }) as Promise<string[]>,
        CONNECT_TIMEOUT_MS,
        "Wallet did not open to connect. Please open your wallet and try again."
      );
    }

    const signerAddr = accounts[0];
    if(!signerAddr) {
      const msg = "No accounts returned from wallet. Please connect your wallet and try again.";
      toast.error("Wallet error", {description: msg,});
      throw new Error(msg);
    }

    // Wake the session without prompting the account UI again
    await providerApi.request({ method: "eth_chainId" }).catch(() => undefined);

    // Bind signer to the active account to ensure correct source address on all providers
    const browserSigner = await browserProvider.getSigner(signerAddr);
    const network = await browserProvider.getNetwork();

    if (viaAddress && viaAddress.toLowerCase() !== signerAddr.toLowerCase()) {
      const msg = `Active wallet address (${signerAddr}) differs from connected address (${viaAddress}). Please re-connect to the correct wallet.`;
      toast.error(msg, {description: msg,});
      throw new Error(msg);
    }

    // Validate chain is VIA. Consider issuing wallet_switchEthereumChain here before throwing.
    const expectedChainId = Number(getNetworkConfig().chainId);
    if (Number(network.chainId) !== expectedChainId) {
      const msg  = `Wrong network. Expected chain ID: ${expectedChainId}, but got: ${network.chainId}`;
      toast.error("Wrong network", {description: msg,});
      throw new Error(msg);
    }

    // Convert amount to L2 token decimals (18 decimals) and wallet balance check before signing
    const l2SatsAmount = ethers.parseUnits(params.amount, L2_BTC_DECIMALS);
    const balWei = await withTimeout(
      provider.getBalance(signerAddr),
    BALANCE_TIMEOUT_MS,
    "Balance check timed out. Please try again."
    );

    if (balWei < l2SatsAmount) {
      const msg = "Insufficient balance to cover withdrawal. Please check your wallet balance and try again.";
      toast.error("Insufficient balance", {description: msg,});
      throw new Error(msg);
    }
    
    // Create the VIA signer
    const signer = Signer.from(browserSigner as unknown as Parameters<typeof Signer.from>[0],
      Number(network.chainId),
      provider
    );

    // Choose timeout and message based on the connector type (WalletConnect vs. injected)
    let signTimeOutMs = SIGN_TIMEOUT_MS;
    let timeOutMsg =
      "No signing request detected. Your wallet may be locked or a popup was blocked. Open your wallet extension (MetaMask/Rabby/Coinbase), unlock it, and approve the transaction.";
    try {
      const { getAccount } = await import("@wagmi/core");
      const { wagmiConfig } = await import("@/lib/wagmi/config");
      const { connector: activeConnector } = getAccount(wagmiConfig) as any;
      // Prefer connector id; fall back to name when id is unavailable
      const isWalletConnect =
        activeConnector?.id === "walletConnect" || activeConnector?.name === "WalletConnect";
      // 120 seconds for WalletConnect due to mobile latency; keep default for injected wallets
      signTimeOutMs = isWalletConnect ? 120_000 : SIGN_TIMEOUT_MS;
      if (isWalletConnect) {
        timeOutMsg =
          "No response from mobile wallet (WalletConnect). Open the wallet app on your phone, ensure the WalletConnect session is active, and approve. If nothing appears, disconnect the session and re-scan the QR code, then retry.";
      }
    } catch {}

    const tx = await withTimeout(
      signer.withdraw({to: params.recipientBitcoinAddress,  amount: l2SatsAmount,}),
      signTimeOutMs,
      timeOutMsg
    );

    const txHash = tx.hash;
    const explorerBase = getNetworkConfig().blockExplorerUrls?.[0] ?? "https://testnet.blockscout.onvia.org";
    const explorerUrl = `${explorerBase.replace(/\/+$/, "")}/tx/${txHash}`;

    return {
      txHash,
      explorerUrl,
    };
  } catch (error: any) {
    console.error("Withdrawal error:", error);
    if (error?.code === 4001) {
      toast.error("Request rejected", {description: "You rejected the request in your wallet.",});
    } else {
      toast.error("Withdrawal failed", {description: (error as Error)?.message || "There was an error processing your withdrawal. Please try again.",});
    }
    throw error;
  }
}
