// src/components/ethereum-bridge/ethereum-bridge-form.tsx
"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import ApprovalModal from "@/components/approval-modal";
import {
  BridgeModeTabs,
  NetworkLaneSelector,
  TransferAmountInput,
  TransactionSummaryCard,
  AvailableBalanceDisplay,
  AmountSlider,
  SourceWalletBanner,
  TransactionSuccessDialog,
} from "@/components/bridge";
import { TransactionHistory } from "@/components/transaction-history";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";

import { AssetAndVaultSection } from "@/components/ethereum-bridge/sections/asset-and-vault-section";
import { DepositSection } from "@/components/ethereum-bridge/sections/deposit-section";
import { WithdrawSection } from "@/components/ethereum-bridge/sections/withdraw-section";
import { ClaimSection } from "@/components/ethereum-bridge/sections/claim-section";
import { useEthereumBridgeForm } from "@/hooks/use-ethereum-bridge-form";
import { useWalletState } from "@/hooks/use-wallet-state";
import { useWalletStore } from "@/store/wallet-store";
import { TOKENS } from "@/services/bridge/tokens";
import { calculateVaultConversion, formatVaultRate } from "@/utils/vault-conversion";
import { getWalletMetadataByRdns } from "@/utils/wallet-metadata";
import type { TokenInfo } from "@/services/bridge/types";

// Dynamic import to avoid SSR issues: the wallet selector relies on browser-only APIs
// (injected providers / window access) and can crash during server rendering.
const WalletsSelectorContainer = dynamic(() => import("@/components/wallets/selector-container"), {
  ssr: false,
});

export function EthereumBridgeForm() {
  const form = useEthereumBridgeForm();
  const { ethTransactions, isLoadingTransactions, fetchEthTransactions, selectedWallet } = useWalletStore();
  const [showTransactions, setShowTransactions] = useState(false);
  const [showEvmWalletSelector, setShowEvmWalletSelector] = useState(false);

  const { isMetamaskConnected, isCorrectL1Network, isCorrectViaNetwork, l1Address, viaAddress } = useWalletState();
  const walletName = getWalletMetadataByRdns(selectedWallet ?? undefined)?.name ?? "Wallet";

  // Derive whether the source wallet is connected and on the correct source chain for the current mode.
  // e.g. { isConnected: true, isCorrectNetwork: true, isReady: true, networkLabel: "Sepolia" }
  const sourceWalletStatus = useMemo(() => {
    const isConnected = isMetamaskConnected && !!(l1Address || viaAddress);
    const isCorrectNetwork = form.mode === "deposit" ? isCorrectL1Network : isCorrectViaNetwork;
    return {
      isConnected,
      isCorrectNetwork,
      isReady: isConnected && isCorrectNetwork,
      networkLabel: form.route.fromNetwork.displayName
    };
  }, [isMetamaskConnected, isCorrectL1Network, isCorrectViaNetwork, l1Address, viaAddress, form.mode, form.route.fromNetwork.displayName]);

  // Vault exchange rate for display (kept in UI layer).
  // e.g. "1 USDC = 1.0234 vUSDC" | "1 vUSDC = 0.9771 USDC" | null
  const exchangeRateDisplay = useMemo(() => {
    if (!form.isYieldEnabled || !form.vaultMetrics.exchangeRate) return null;
    return formatVaultRate(form.vaultMetrics.exchangeRate, form.selectedAsset.symbol, form.selectedAsset.l2ValueSymbol || `v${form.selectedAsset.symbol}`, form.mode);
  }, [form.isYieldEnabled, form.vaultMetrics.exchangeRate, form.selectedAsset, form.mode]);

  // APY display: "0%" when yield disabled, "..." while loading, otherwise Aave APY.
  // e.g. "4.52%" | "0%" | "..."
  let apyDisplay = form.aaveApys[form.selectedAsset.symbol] || "...";
  if (!form.isYieldEnabled) apyDisplay = "0%";
  if (form.isYieldEnabled && (form.isLoadingApy || form.isLoadingVaultMetrics)) apyDisplay = "...";

  // TVL display: prefer live vault metrics over static token config, placeholder while loading.
  // e.g. "$1.25M" | "$500.00K" | "..."
  let tvlDisplay = form.vaultMetrics.tvl || form.selectedAsset.tvl;
  if (form.isLoadingVaultMetrics) tvlDisplay = "...";

  // Withdraw + yield: estimated receive amount by converting vault shares back to underlying.
  // e.g. "950.1234 USDC" | null
  const expectedReceiveDisplay = useMemo(() => {
    const isWithdraw = form.mode === "withdraw";
    const exchangeRate = form.vaultMetrics.exchangeRate;
    const inputAmount = form.inputAmount;
    if (!isWithdraw || !form.isYieldEnabled || !inputAmount || !exchangeRate) return null;

    // Conversion can fail if inputs are invalid (empty/NaN) - treat as "no estimate" rather than throwing.
    const expected = calculateVaultConversion(inputAmount, exchangeRate, "withdraw", form.selectedAsset.decimals);

    if (!expected) return null;

    return `${expected.outputAmount} ${form.selectedAsset.symbol}`;
  }, [form.mode, form.isYieldEnabled, form.inputAmount, form.vaultMetrics.exchangeRate, form.selectedAsset]);

  // Transaction summary: always returns an object so the card renders unconditionally.
  const summaryState = useMemo(() => {
    const decimals = form.selectedAsset.decimals;
    const underlyingSymbol = form.selectedAsset.symbol;
    const vaultSymbol = form.selectedAsset.l2ValueSymbol || `v${underlyingSymbol}`;
    const input = form.inputAmount;
    const hasAmount = input > 0;
    const emptyAmountDisplay = (0).toFixed(decimals);
    const amountDisplay = hasAmount ? input.toFixed(decimals) : emptyAmountDisplay;

    // Standard (no yield): send and receive are the same token and amount.
    if (!form.isYieldEnabled) {
      return { amountDisplay, receiveAmount: amountDisplay, receiveUnit: underlyingSymbol, showConversion: false };
    }

    const receiveUnit = form.mode === "deposit" ? vaultSymbol : underlyingSymbol;

    // No amount entered yet - show zeroes.
    if (!hasAmount) {
      return { amountDisplay, receiveAmount: emptyAmountDisplay, receiveUnit, showConversion: false };
    }

    // Yield enabled but exchange rate not loaded yet.
    const exchangeRate = form.vaultMetrics.exchangeRate;
    if (!exchangeRate) {
      return { amountDisplay, receiveAmount: "...", receiveUnit, showConversion: false };
    }

    const conversion = calculateVaultConversion(input, exchangeRate, form.mode, decimals);
    if (!conversion) {
      return { amountDisplay, receiveAmount: "...", receiveUnit, showConversion: false };
    }

    return { amountDisplay, receiveAmount: conversion.outputAmount, receiveUnit, showConversion: true };
  }, [form.inputAmount, form.isYieldEnabled, form.vaultMetrics.exchangeRate, form.selectedAsset, form.mode]);

  const approvalTransactionData = useMemo(() => {
    const fallbackUnderlyingToken: TokenInfo = {
      symbol: form.selectedAsset.symbol,
      name: form.selectedAsset.symbol,
      decimals: form.selectedAsset.decimals,
      icon: form.selectedAsset.icon,
    };

    const underlyingToken = TOKENS[form.selectedAsset.symbol] ?? fallbackUnderlyingToken;
    const vaultSymbol = form.selectedAsset.l2ValueSymbol || `v${form.selectedAsset.symbol}`;
    const vaultToken: TokenInfo = {
      symbol: vaultSymbol,
      name: vaultSymbol,
      decimals: form.selectedAsset.decimals,
      icon: underlyingToken.icon,
    };

    const fromToken = form.isYieldEnabled && form.mode === "withdraw" ? vaultToken : underlyingToken;
    const toToken = form.isYieldEnabled && form.mode === "deposit" ? vaultToken : underlyingToken;

    return {
      fromAmount: summaryState.amountDisplay,
      toAmount: summaryState.receiveAmount,
      fromToken,
      toToken,
      fromNetwork: form.route.fromNetwork,
      toNetwork: form.route.toNetwork,
      recipientAddress: form.recipientAddress || undefined,
      networkFee: "Estimated in wallet",
      networkFeeKind: "networkGas" as const,
    };
  }, [form.selectedAsset, form.isYieldEnabled, form.mode, form.route, form.recipientAddress, summaryState]);

  const handleResetSuccess = () => {
    form.resetSuccessResult();
  };

  return (
    <div className="w-full flex justify-center py-8 px-4">
      <div className="w-full max-w-4xl">
        <BridgeModeTabs mode={form.mode} onModeChange={form.setMode} withdrawBadgeCount={form.readyWithdrawalsCount} onWithdrawBadgeClick={() => form.setClaimModalOpen(true)} />

        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="text-center mb-4 pt-8 px-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Via Ethereum Network Bridge</h1>
            <p className="text-sm text-slate-600">Bridge assets securely</p>
          </div>

          <AssetAndVaultSection selectedAssetSymbol={form.selectedAssetSymbol} onSelectAsset={form.setSelectedAssetSymbol} isYieldEnabled={form.isYieldEnabled} onToggleYield={form.setIsYieldEnabled} apy={apyDisplay} tvl={tvlDisplay} exchangeRateDisplay={exchangeRateDisplay} />

          <ClaimSection isOpen={form.isClaimModalOpen} onOpenChange={form.setClaimModalOpen} onReadyCountChange={form.setReadyWithdrawalsCount} />

          <form className="px-8 pb-8">
            <NetworkLaneSelector route={form.route} onSwap={form.toggleMode} />

            <SourceWalletBanner walletType="evm" isConnected={sourceWalletStatus.isConnected} isCorrectNetwork={sourceWalletStatus.isCorrectNetwork} targetNetworkLabel={sourceWalletStatus.networkLabel} onConnect={() => setShowEvmWalletSelector(true)} onSwitchNetwork={() => form.ensureOnSourceNetwork().catch(console.warn)} />

            {/* Gate amount inputs on wallet readiness to avoid confusing partial states (no wallet / wrong chain / zero balance). */}
            {sourceWalletStatus.isReady && form.balance && form.walletBalance > 0 && (
              <div className="space-y-6 mb-8">
                <TransferAmountInput value={form.amount} onChange={form.handleAmountChange} onMax={form.handleMax} unit={form.amountUnit} placeHolder="0.0" maxDisabled={!form.balance || form.walletBalance <= 0} />
              </div>
            )}

            <div className="mb-6">
              <AvailableBalanceDisplay balance={form.balance} unit={form.amountUnit} isLoading={form.isLoadingBalance} />
            </div>

            {sourceWalletStatus.isReady && form.balance && form.walletBalance > 0 && (
              <div className="mb-6">
                <AmountSlider value={form.inputAmount} max={form.maxAmount} onChange={form.handleSliderChange} unit={form.amountUnit} decimals={form.selectedAsset.decimals} />
              </div>
            )}

            <div className="mb-6">
              <TransactionSummaryCard amount={summaryState.amountDisplay} fee="Estimated in wallet" feeKind="networkGas" netReceive={summaryState.receiveAmount} unit={form.amountUnit} netReceiveUnit={summaryState.receiveUnit} showConversion={summaryState.showConversion} />
            </div>

            {form.mode === "deposit" ? (
              <DepositSection amount={form.amount} recipient={form.recipientAddress} onRecipientChange={form.setRecipientAddress} onSubmit={form.submitDeposit} isSubmitting={form.isSubmitting} error={form.submitError} />
            ) : (
              <WithdrawSection amount={form.amount} recipient={form.recipientAddress} onRecipientChange={form.setRecipientAddress} expectedReceive={expectedReceiveDisplay} onSubmit={form.submitWithdraw} isSubmitting={form.isSubmitting} />
            )}

            <div className="mt-8">
              <Button variant="ghost" className="flex items-center justify-between w-full py-2 text-sm font-medium" onClick={() => setShowTransactions(!showTransactions)}>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Transaction History</span>
                  {ethTransactions.length > 0 && (
                    <span className="bg-primary/10 text-primary text-xs rounded-full px-2 py-0.5">{ethTransactions.length}</span>
                  )}
                </div>
                {showTransactions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>

              {showTransactions && (
                <div className="w-full mt-2">
                  {/* Ethereum bridge view: hide BTC entries (those belong on the Bitcoin bridge). */}
                  <TransactionHistory isLoading={isLoadingTransactions} onRefresh={fetchEthTransactions} transactions={ethTransactions} excludeSymbol="BTC" />
                </div>
              )}
            </div>
          </form>

          <TransactionSuccessDialog
            open={form.successResult !== null}
            onOpenChange={(open) => !open && handleResetSuccess()}
            result={form.successResult}
            onReset={handleResetSuccess}
          />

          <ApprovalModal
            open={form.approvalOpen}
            onOpenChange={form.setApprovalOpen}
            onCancel={form.cancelSubmit}
            direction={form.mode}
            title="Waiting for Approval"
            walletName={walletName}
            transactionData={approvalTransactionData}
          />
        </div>
      </div>

      {/* EVM Wallet Selector Modal.
          Overlay hack: the full-screen wrapper does not capture clicks, but the modal container does. */}
      {showEvmWalletSelector && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto" }}>
            <WalletsSelectorContainer initialOpen={true} onClose={() => setShowEvmWalletSelector(false)} showTrigger={false} />
          </div>
        </div>
      )}
    </div>
  );
}
