"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Wallet, Copy, Check } from "lucide-react";
import { useWalletStore } from "@/store/wallet-store";
import { Layer } from "@/services/config";
import { maskAddress } from "@/utils";
import { useMemo, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import dynamic from "next/dynamic";
const WalletsSelectorContainer = dynamic(() => import('./wallets/selector-container'), { ssr: false });


type Mode = "via" | "bitcoin";

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
 * - Supports both EVM (VIA) and Bitcoin modes
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

  // Wallet store wiring
  const store = useWalletStore();
  const connected = isEvm ? store.isMetamaskConnected : store.isXverseConnected;
  const correctNetwork = isEvm ? store.isCorrectViaNetwork : store.isCorrectBitcoinNetwork;
  const walletAddress = (isEvm ? store.viaAddress : store.bitcoinAddress) ?? "";

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
    () => placeholder ?? (isEvm ? "0x..." : "bc1..."),  // for testnet address start with tb1. For mainnet, start with bc1. // TODO - have the correct placeholder depending on our network configuration
    [placeholder, isEvm]
  );

  // Derived state:
  // - showReplaceWithWallet: user has a different value than the wallet address, but wallet is available
  // - usingWallet: value equals wallet address while connected & on correct network
  // - usingManual: any case where value is present but not usingWallet
  const showReplaceWithWallet =
    connected && !!walletAddress && !!value && value !== walletAddress;
  const usingWallet =
    connected && correctNetwork && !!walletAddress && !!value && value === walletAddress;
  const usingManual = !!value && !usingWallet;

  const computedLabel = label ?? (isEvm ? "Recipient VIA Address" : "Recipient Bitcoin Address");

  return (
    <div className={className ? `space-y-2 ${className}` : "space-y-2"}>
      {/* Header: Field label, source pill, and an aria-live region for accessibility */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{computedLabel}</Label>

        {/* Source pill: indicates whether the input is from the wallet or manual entry */}
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${usingManual ? "border-slate-300 text-slate-600 bg-slate-50" : "border-blue-300 text-blue-700 bg-blue-50"}`}>Source: {usingManual ? "Manual" : "Wallet"}</span>

        {/* Screen-reader only: announce source changes non-visually */}
        <span className="sr-only" aria-live="polite">
          Recipient source: {usingManual ? "Manual" : usingWallet ? "Wallet" : "Unknown"}
        </span>
      </div>

      {/* Connected but on the wrong network -> nudge to switch */}
      {connected && !correctNetwork && (
        <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-xs text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Wrong network. {isEvm ? "Switch to VIA network" : "Switch to the correct Bitcoin network"} to auto-fill</span>
          </div>
          <Button type="button" size="sm" variant="secondary" className="h-6 px-2 text-xs" onClick={() => store.switchNetwork(isEvm ? Layer.L2 : Layer.L1)}>Switch</Button>
        </div>
      )}

      {/* Branch B: Connected + correct network + wallet address + not manually overriding -> Show 'using wallet' summary */}
      {connected && correctNetwork && walletAddress && !usingManual && (
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center">
              <Wallet className="w-2.5 h-2.5 text-blue-600" />
            </div>
            <span className="text-xs text-slate-700">Using your wallet address: <span className="font-mono">{maskAddress(walletAddress)}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant='ghost' className="h-7 px-2 text-xs" onClick={async() => {
              try {
                await navigator.clipboard.writeText(walletAddress);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {}
            }}
                    aria-label="Copy address to clipboard">
              {copied ? <Check className='h-3.5 w-3.5 text-green-600'/> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            {/* Allows switching to manual entry, revealing the input */}
            <Button type="button" size="sm" variant="secondary" className="h-7 px-2 text-xs" onClick={() => setShowManual(true)}>Enter a different address</Button>
          </div>
        </div>
      )}

      {/* Branch C: Wallet available and input differs from wallet address -> Offer to replace with wallet */}
      {showReplaceWithWallet && !showManual && (
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center">
              <Wallet className="w-2.5 h-2.5 text-blue-600" />
            </div>
            <span className="text-xs text-slate-600">Wallet detected: {maskAddress(walletAddress)}</span>
          </div>
          <Button type="button" size="sm" variant="secondary" className="h-7 px-2 text-xs" onClick={() => {
              const shouldReplace =
                !value ||
                value.trim() === "" ||
                value === walletAddress ||
                window.confirm("Replace the entered address with your connected wallet address?");
              if (shouldReplace) onChange(walletAddress);
            }}
          >Replace with wallet</Button>
        </div>
      )}

      {/* Branch D: Not connected -> Prompt to connect wallet (optional manual override) */}
      {!connected && (
        <div className="border-2 border-dashed border-blue-300 bg-blue-50/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Wallet className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm mb-1">{isEvm ? "Connect your EVM wallet for instant setup" : "Connect your Bitcoin wallet for instant setup"}</div>
              <div className="text-xs text-slate-600 mb-3">Your address will be automatically filled in</div>
              <div className="flex gap-2">
                {/* Connect wallet CTA (Metamask for EVM, Xverse for BTC) */}
                <Button type="button" size="sm" onClick={() => (isEvm ? setShowEvmSelector(true) : store.connectXverse())} className="bg-blue-600 hover:bg-blue-700">{isEvm ? "Connect Wallet" : "Connect Xverse"}</Button>
                {/* Allow user to enter manually even while disconnected */}
                {allowManualOverride && (
                  <Button type="button" variant="ghost" size="sm" className="text-slate-600" onClick={() => setShowManual(true)}>Enter manually</Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Branch E: Show manual input when forced, or when current value differs from wallet address */}
      {(showManual || (connected && walletAddress && value && value !== walletAddress)) && (
        <div className="space-y-2">
          {/* While connected, still allow switching back to the wallet address */}
          {connected && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center">
                  <Wallet className="w-2.5 h-2.5 text-blue-600" />
                </div>
                <span className="text-sm text-slate-600">Switch to connected wallet address</span>
              </div>
              <Button type="button" size="sm" variant="secondary" className="h-6 px-2 text-xs"
                onClick={() => {
                  const shouldReplace =
                    !value ||
                    value.trim() === "" ||
                    value === walletAddress ||
                    window.confirm("Replace the entered address with your connected wallet address?");
                  if (shouldReplace) onChange(walletAddress);
                }}
              >Use wallet address</Button>
            </div>
          )}

          {/* Manual input field */}
          <div className="relative">
            <Input placeholder={computedPlaceholder} value={value} onChange={(e) => {
                // The first keystroke disables the autofill behavior for this session
                if (!userHasTyped && e.target.value.trim().length > 0) setUserHasTyped(true);
                onChange(e.target.value);
              }}
              className="peer font-mono border-2 border-dashed border-slate-300 bg-slate-50/50 focus:border-blue-500 focus:bg-white placeholder-shown:pr-28 pr-3"
              aria-label={label ?? (isEvm ? "Recipient VIA Address" : "Recipient Bitcoin Address")}
            />
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center transition-opacity duration-150 opacity-0 peer-placeholder-shown:opacity-100">
              <span className="text-[10px] text-slate-400">Enter {isEvm ? "VIA" : "Bitcoin"} address manually</span>
            </div>
          </div>

          {/* Security Warning */}
          {usingManual && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex gap-2">
                <div className="w-4 h-4 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-2.5 h-2.5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm text-amber-800 mb-1">
                    Always double-check your address
                  </div>
                  <div className="text-xs text-amber-700 space-y-1">
                    <div>Funds sent to wrong address cannot be recovered.</div>
                    <div>Consider connecting your wallet for safety.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live preview of the recipient and source (manual vs. wallet) */}
          {value && (
            <div className="text-xs text-slate-600 mt-2">
              Recipient: <span className="font-mono">{maskAddress(value)}</span>
              <span className={usingManual ? "ml-1 text-slate-700" : "ml-1 text-blue-700"}>• {usingManual ? "Manual" : "Wallet"}</span>
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
