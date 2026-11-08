// src/components/address-field-with-wallet.tsx
"use client";

import { AlertTriangle, Wallet, Copy, CheckCircle2 } from "lucide-react";
import { useWalletStore } from "@/store/wallet-store";
import { Layer } from "@/services/config";
import { maskAddress } from "@/utils";
import { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
const WalletsSelectorContainer = dynamic(() => import('./wallets/selector-container'), { ssr: false });


type Mode = "via" | "bitcoin" | "ethereum";

interface AddressFieldWithWalletProps {
  mode: Mode;
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  autoFillOnConnect?: boolean;
  allowManualOverride?: boolean;
  className?: string;
}

/**
 * AddressFieldWithWallet
 *
 * Purpose:
 * - Single address field that can be autofilled from a connected wallet
 * - Supports EVM (VIA), Bitcoin, and Ethereum L1 modes
 * - Guides the user through states: disconnected, wrong network, using wallet, manual override
 *
 * - "usingWallet" means the input value equals the connected wallet address (on correct network)
 * - "usingManual" means the input value does NOT equal the connected wallet address
 * - "showManual" forces the manual entry UI (e.g., after clicking "Enter a different address")
 * - We autofill once when connected and on the correct network if the user hasn't typed yet
 */
export default function AddressFieldWithWallet({
  mode,
  label,
  className,
  allowManualOverride = true,
  value,
  onChange,
  placeholder,
}: Pick<AddressFieldWithWalletProps, "mode" | "label" | "className" | "allowManualOverride" | "value" | "onChange" | "placeholder">) {
  // Mode helpers
  const isEvm = mode === "via";
  const isEth = mode === "ethereum";

  // Wallet store wiring
  const store = useWalletStore();

  let connected: boolean;
  let correctNetwork: boolean;
  let walletAddress: string;

  if (isEvm) {
    // For EVM L2 recipient, we use MetaMask.
    // Since we might be on L1 (Deposit) or L2 (Withdraw), we can use the address from either connection
    // as long as it is an EVM address.
    const isMetamask = store.isMetamaskConnected;
    const isL1 = store.isL1Connected;

    connected = isMetamask || isL1;
    // We consider "correct network" to be true if we are connected to *any* EVM network we support (Via or Sepolia),
    // because for a recipient field we just want the address, and the address is the same.
    // BUT `store.isCorrectViaNetwork` specifically checks for Via Chain ID.
    // If we are on Sepolia (L1), `isCorrectViaNetwork` is false.
    // We should relax this: if we have an address, we can use it.
    correctNetwork = store.isCorrectViaNetwork || store.isCorrectL1Network;
    walletAddress = store.viaAddress || store.l1Address || "";
  } else if (isEth) {
    // For Ethereum mode, check if any EVM wallet is connected (could be on Sepolia or VIA)
    // The address is the same across EVM networks, so we can use address from either network
    connected = store.isL1Connected || store.isMetamaskConnected;
    // For recipient address, we don't need to be on the correct network - any EVM address works
    // since the same wallet address is valid on both Sepolia and VIA
    correctNetwork = true; // Always consider it correct for recipient purposes
    walletAddress = store.l1Address || store.viaAddress || "";
  } else {
    // Bitcoin
    connected = store.isXverseConnected;
    correctNetwork = store.isCorrectBitcoinNetwork;
    walletAddress = store.bitcoinAddress ?? "";
  }

  // Local UI state
  const [showManual, setShowManual] = useState(false); // Explicitly reveal manual entry UI
  const [userHasTyped, setUserHasTyped] = useState(false); // Set after the user starts typing into the input
  const [copied, setCopied] = useState(false); // Track if the address has been copied to clipboard
  const [showEVMSelector, setShowEvmSelector] = useState(false); // show EVM wallet selector

  /**
   * Autofill behavior:
   * - When connected on the correct network and a wallet address exists
   * - If the user hasn't typed and the input is empty, fill the input with the wallet address
   */
  useEffect(() => {
    if (!connected || !correctNetwork) return;
    if (!walletAddress) return;
    if (userHasTyped) return;
    if (!value || value.trim() === "") {
      onChange(walletAddress);
    }
  }, [connected, correctNetwork, walletAddress, userHasTyped, value, onChange]);

  // UX helpers
  const computedPlaceholder = useMemo(
    () => placeholder ?? (isEvm ? "0x..." : "bc1..."),
    [placeholder, isEvm]
  );

  // Derived state
  const usingWallet =
    connected && correctNetwork && !!walletAddress && !!value && value === walletAddress;
  const usingManual = !!value && !usingWallet;

  const computedLabel = label ?? (isEvm ? "Recipient Via Address" : isEth ? "Recipient Ethereum Address" : "Recipient Bitcoin Address");

  // Copy address handler
  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  // Connect wallet handler
  const handleConnectWallet = () => {
    if (isEvm || isEth) {
      // Both EVM (via) and Ethereum (L1) use EVM wallets
      setShowEvmSelector(true);
    } else {
      // Bitcoin mode
      store.connectXverse();
    }
  };

  return (
    <div className={className ? `mb-8 ${className}` : "mb-8"}>
      {/* Header: Field label and source pill */}
      <div className="flex items-center justify-between mb-4">
        <label className="text-sm font-semibold text-slate-900 uppercase tracking-wide">{computedLabel}</label>
        {(usingWallet || usingManual) && (
          <div className={`text-[10px] font-semibold px-3 py-1 rounded-full border shadow-xs ${usingManual ? 'border-slate-300 text-slate-700 bg-white' : 'border-blue-200 text-blue-700 bg-blue-50'}`}>
            {usingManual ? 'Source: Manual' : 'Source: Wallet'}
          </div>
        )}
      </div>

      {/* Screen-reader only: announce source changes non-visually */}
      <span className="sr-only" aria-live="polite">
        Recipient source: {usingManual ? "Manual" : usingWallet ? "Wallet" : "Unknown"}
      </span>

      {/* Connected but on the wrong network -> nudge to switch */}
      {connected && !correctNetwork && (
        <div className="bg-linear-to-r from-amber-50 to-amber-100 border-2 border-amber-300 rounded-xl px-4 py-3.5 shadow-md mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-700" strokeWidth={2.5} />
              </div>
              <div>
                <div className="font-semibold text-sm text-amber-900 mb-0.5">Wrong Network Detected</div>
                <div className="text-xs text-amber-700">{isEvm ? 'Switch to VIA network' : isEth ? 'Switch to Ethereum network' : 'Switch to Bitcoin network'} to auto-fill address</div>
              </div>
            </div>
            <button 
              type="button" 
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-white border-2 border-amber-400 text-amber-900 hover:bg-amber-50 shadow-xs" 
              onClick={() => {
                if (isEvm) {
                  store.switchNetwork(Layer.L2);
                } else if (isEth) {
                  // For Ethereum, we need to ensure L1 network is correct
                  // The network switching for Ethereum is handled by the form itself
                  // Just trigger wallet connection which will handle network switching
                  handleConnectWallet();
                } else {
                  store.switchNetwork(Layer.L1);
                }
              }}
            >
              Switch Network
            </button>
          </div>
        </div>
      )}

      {/* Connected + correct network + wallet address + not manually overriding -> Show 'using wallet' summary */}
      {connected && correctNetwork && walletAddress && !showManual && (
        <div className="bg-linear-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 shadow-lg mb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shrink-0 shadow-md">
                <Wallet className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold text-sm text-blue-900 mb-1">Wallet Connected</div>
                    <div className="text-xs text-blue-700">Funds will be sent to your connected wallet</div>
                  </div>
                  <button 
                    type="button" 
                    className="px-4 py-2 text-xs font-semibold rounded-lg border-2 border-blue-300 bg-white text-blue-700 hover:bg-blue-50 shadow-xs whitespace-nowrap flex items-center gap-1.5 ml-3" 
                    onClick={handleCopyAddress}
                    aria-label="Copy address to clipboard"
                  >
                    {copied ? (<><CheckCircle2 className="w-3 h-3" /> Copied</>) : (<><Copy className="w-3 h-3" /> Copy</>)}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-white border border-blue-200 rounded-lg px-3 py-2 font-mono text-sm text-slate-900 shadow-xs">{maskAddress(walletAddress)}</div>
                  {allowManualOverride && (
                    <button 
                      type="button" 
                      className="px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-xs whitespace-nowrap" 
                      onClick={() => setShowManual(true)}
                    >
                      Use Different
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Not connected -> Prompt to connect wallet */}
      {!connected && (
        <div className="border-2 border-dashed border-blue-400 bg-linear-to-br from-blue-50 to-white rounded-xl p-6 shadow-md mb-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
              <Wallet className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-base text-slate-900 mb-1">{isEvm || isEth ? 'Connect Your EVM Wallet' : 'Connect Your Bitcoin Wallet'}</div>
              <div className="text-sm text-slate-600 mb-4">Your recipient address will be automatically filled in for maximum safety</div>
              <div className="flex gap-3">
                <button 
                  type="button" 
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-2.5 text-sm font-semibold shadow-md hover:shadow-lg transition-all" 
                  onClick={handleConnectWallet}
                >
                  {isEvm || isEth ? 'Connect Wallet' : 'Connect Xverse'}
                </button>
                {allowManualOverride && (
                  <button 
                    type="button" 
                    className="text-slate-700 bg-white border-2 border-slate-300 rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-slate-50 shadow-xs" 
                    onClick={() => setShowManual(true)}
                  >
                    Enter Manually Instead
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual entry section */}
      {showManual && (
        <div className="space-y-4">
          {/* While connected, allow switching back to the wallet address */}
          {connected && (
            <div className="bg-slate-50 border border-slate-300 rounded-lg p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-blue-600" strokeWidth={2} />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-slate-900">Wallet Available</div>
                    <div className="text-xs text-slate-600">Switch back to use {maskAddress(walletAddress)}</div>
                  </div>
                </div>
                <button 
                  type="button" 
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-xs" 
                  onClick={() => { 
                    if (walletAddress) onChange(walletAddress); 
                    setShowManual(false); 
                  }}
                >
                  Use Wallet
                </button>
              </div>
            </div>
          )}

          {/* Manual input field */}
          <div className="relative">
            <input placeholder={computedPlaceholder} value={value} onChange={(e) => {
              // The first keystroke disables the autofill behavior for this session
              if (!userHasTyped && e.target.value.trim().length > 0) setUserHasTyped(true);
              onChange(e.target.value);
            }}
              className="peer font-mono border-2 border-dashed border-slate-300 bg-slate-50/50 focus:border-blue-500 focus:bg-white placeholder-shown:pr-28 pr-3"
              aria-label={label ?? (isEvm ? "Recipient VIA Address" : "Recipient Bitcoin Address")}
            />
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center transition-opacity duration-150 opacity-0 peer-placeholder-shown:opacity-100">
              <span className="text-[10px] text-slate-400">Enter {isEvm ? "Via" : isEth ? "Ethereum" : "Bitcoin"} address manually</span>
            </div>
            <input
              type="text"
              placeholder={computedPlaceholder}
              value={value}
              onChange={(e) => { 
                if (!userHasTyped && e.target.value.trim().length > 0) setUserHasTyped(true); 
                onChange(e.target.value); 
              }}
              className="w-full font-mono border-2 border-dashed border-slate-400 bg-slate-50 focus:border-blue-500 focus:bg-white rounded-lg px-4 py-4 text-base focus:outline-hidden focus:ring-2 focus:ring-blue-200 shadow-inner placeholder:text-slate-400 transition-all"
              aria-label={computedLabel}
            />
          </div>

          {/* Security Warning - shown when using manual entry */}
          {usingManual && (
            <div className="bg-white border-2 border-amber-400 rounded-xl overflow-hidden shadow-lg">
              <div className="bg-linear-to-r from-amber-100 to-amber-50 px-5 py-3 border-b-2 border-amber-400">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-700" strokeWidth={2.5} />
                  <span className="font-bold text-sm text-amber-900">Critical: Verify Recipient Address</span>
                </div>
              </div>
              <div className="p-5 bg-amber-50/50">
                <div className="space-y-3 text-sm text-amber-900">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-amber-200 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-amber-900 font-bold text-xs">1</span>
                    </div>
                    <div>
                      <div className="font-semibold mb-0.5">Irreversible Transaction</div>
                      <div className="text-xs text-amber-800">Funds sent to incorrect addresses cannot be recovered under any circumstances</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-amber-200 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-amber-900 font-bold text-xs">2</span>
                    </div>
                    <div>
                      <div className="font-semibold mb-0.5">Verify Every Character</div>
                      <div className="text-xs text-amber-800">Double-check the complete address before proceeding with transfer</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-amber-200 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-amber-900 font-bold text-xs">3</span>
                    </div>
                    <div>
                      <div className="font-semibold mb-0.5">Recommended: Use Wallet Connection</div>
                      <div className="text-xs text-amber-800">Connecting your wallet eliminates manual entry errors and provides additional security</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live preview of the recipient and source */}
          {value && (
            <div className="bg-slate-100 border border-slate-300 rounded-lg px-4 py-3 shadow-xs">
              <div className="text-xs text-slate-600 mb-1">Recipient Address Preview:</div>
              <div className="font-mono text-sm text-slate-900 font-medium">
                {maskAddress(value)}
                <span className={`ml-2 ${usingManual ? 'text-slate-700' : 'text-blue-700'}`}>• {usingManual ? 'Manual Entry' : 'From Wallet'}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* EVM Wallet Selector Dialog */}
      {isEvm && showEVMSelector && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto" }}>
            <WalletsSelectorContainer initialOpen={true} onClose={() => setShowEvmSelector(false)} showTrigger={false}/>
          </div>
        </div>
      )}
    </div>
  );
}
