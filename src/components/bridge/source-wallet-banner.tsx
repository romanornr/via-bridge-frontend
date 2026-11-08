// src/components/bridge/source-wallet-banner.tsx
"use client";

import { AlertTriangle, Wallet } from "lucide-react";

interface SourceWalletBannerProps {
  /** Type of wallet needed for the source */
  walletType: "bitcoin" | "evm";
  /** Whether the source wallet is connected */
  isConnected: boolean;
  /** Whether the source wallet is on the correct network */
  isCorrectNetwork: boolean;
  /** Label for the network the source wallet should be on (e.g. "Ethereum Sepolia", "Bitcoin Testnet4") */
  targetNetworkLabel: string;
  /** Callback to connect the source wallet */
  onConnect: () => void;
  /** Callback to switch to the correct network */
  onSwitchNetwork: () => void;
}

/**
 * SourceWalletBanner
 *
 * Displays a prompt to connect or switch the network of the source wallet
 *
 * States:
 * - Not connected: Blue banner with dashed border and connect button
 * - Connected but wrong network: Amber banner with switch network button
 * - Connected and correct network: returns null (no banner shown)
 *
 * @example
 * ```tsx
 * <SourceWalletBanner
 *   walletType="bitcoin"
 *   isConnected={false}
 *   isCorrectNetwork={false}
 *   targetNetworkLabel="Bitcoin Testnet4"
 *   onConnect={handleConnect}
 *   onSwitchNetwork={handleSwitchNetwork}
 * />
 * ```
 */
export function SourceWalletBanner({walletType, isConnected, isCorrectNetwork, targetNetworkLabel, onConnect, onSwitchNetwork}: SourceWalletBannerProps) {
  // Don't render if the wallet is ready
  if (isConnected && isCorrectNetwork) return null;

  const walletLabel = walletType === "bitcoin" ? "Bitcoin" : "EVM";
  const connectButtonLabel = walletType === "bitcoin" ? "Connect Xverse" : "Connect Wallet";

  // Not connected state
  if (!isConnected) {
    return (
      <div className="border-2 border-dashed border-blue-400 bg-linear-to-br from-blue-50 to-white rounded-xl px-4 py-3.5 shadow-md mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shrink-0 shadow-md">
              <Wallet className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <div className="font-semibold text-sm text-slate-900 mb-0.5">
                {walletLabel} Wallet Required
              </div>
              <div className="text-xs text-slate-600">
                Connect your {walletLabel} wallet
              </div>
            </div>
          </div>
          <button
            type="button"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-xs font-semibold shadow-md hover:shadow-lg transition-all"
            onClick={onConnect}
          >
            {connectButtonLabel}
          </button>
        </div>
      </div>
    );
  }

  // Connected but wrong network state
  return (
    <div className="bg-linear-to-r from-amber-50 to-amber-100 border-2 border-amber-300 rounded-xl px-4 py-3.5 shadow-md mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-700" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-semibold text-sm text-amber-900 mb-0.5">
              Wrong Network Detected
            </div>
            <div className="text-xs text-amber-700">
              Switch to {targetNetworkLabel} to continue
            </div>
          </div>
        </div>
        <button
          type="button"
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-white border-2 border-amber-400 text-amber-900 hover:bg-amber-50 shadow-xs"
          onClick={onSwitchNetwork}
        >
          Switch Network
        </button>
      </div>
    </div>
  );
}
