// src/components/bridge/bridge-form.tsx
"use client";
import {useState, useMemo, useEffect} from "react";
import { cn } from "@/lib/utils";
import { useBridgeSubmit } from "@/hooks/useBridgeSubmit";
import { useBalance} from "@/hooks/useBalance";
import { verifyRecipientAddress} from "@/utils/address";
import { GetCurrentRoute } from "@/services/bridge/routes";
import { BRIDGE_CONFIG } from "@/services/config";
import { useWalletStore } from "@/store/wallet-store";

import {
  BridgeModeTabs,
  type BridgeMode,
  NetworkLaneSelector,
  TransferAmountInput,
  AvailableBalanceDisplay,
  AmountSlider,
  TransactionSummaryCard,
  RecipientAddressSection,
  BridgeSubmitButton,
  TransactionSuccessDialog,
} from "./index";
import ApprovalModal from "@/components/approval-modal";
import {useDebounce} from "@/hooks/useDebounce";
import { toL1Amount } from "@/helpers";
import {
  FEE_RESERVE_BTC,
  MIN_DEPOSIT_BTC,
  MIN_DEPOSIT_SATS,
  MIN_WITHDRAW_BTC,
  MIN_WITHDRAW_SATS,
} from "@/services/constants";

interface BridgeFormProps {
  /** Initial mode */
  initialMode?: BridgeMode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Bridge Form
 *
 * Main form component for the bridge page that combines deposit and withdrawal functionality
 *
 * @example
 * ```tsx
 * <BridgeForm initialMode="deposit" />
 * ```
 *
 * Flow:
 * 1. User selects a mode (deposit/withdraw)
 * 2. User enters the transfer amount
 * 3. User provides recipient address (wallet or manual)
 * 4. User confirms transfer details and initiates transfer
 */
export function BridgeForm({ initialMode = "deposit", className}:  BridgeFormProps) {
  const [mode, setMode] = useState<BridgeMode>(initialMode);
  const [amount, setAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [approvalOpen, setApprovalOpen] = useState(false);

  // Use custom hook for submission logic
  const { isSubmitting, successResult, submit, reset: resetSubmit, cancel } = useBridgeSubmit();

  // Get wallet data from store
  const { bitcoinAddress, bitcoinPublicKey } = useWalletStore();
  const { viaAddress } = useWalletStore();

  const {
    //isLoadingFeeEstimation,
    feeEstimation: storeFeeEstimation,
    fetchFeeEstimation,
    fetchDepositFeeEstimation,
  } = useWalletStore();

  // Debounce amount to avoid excessive API calls
  const debouncedAmount = useDebounce(amount, 600);

  // Fetch fee estimation when debounced amount changes
  useEffect(() => {
    const amountStr = String(debouncedAmount ?? "").trim();
    if (!amountStr) return;

    const sats = toL1Amount(amountStr);
    if (!Number.isFinite(sats) || sats <= 0) return;

    if (mode === "deposit") {
      fetchDepositFeeEstimation(sats);
    } else {
      fetchFeeEstimation(sats);
    }
  }, [debouncedAmount, mode, fetchFeeEstimation, fetchDepositFeeEstimation]);

  const route = useMemo(() => GetCurrentRoute(mode, BRIDGE_CONFIG.defaultNetwork), [mode]);
  const unit = route.token.symbol;


  // Fetch balance using the hook
  const { balance, isLoading: isLoadingBalance } = useBalance({
    networkType: route.fromNetwork.type,
    address: route.fromNetwork.type === "bitcoin" ? bitcoinAddress : viaAddress,
    token: route.token,
  });

  // parse amount to number
  const amountNumber = useMemo(() => {
    const n = parseFloat(amount);
    return Number.isFinite(n) ? n : 0;
  }, [amount]);

  // calculate max amount (balance - fee reserve for deposits)
  const maxAmount = useMemo(() => {
    if (!balance) return 0;
    const bal = parseFloat(balance);
    if (!Number.isFinite(bal)) return 0;

    // Fee reserve only needed for Bitcoin as source (to cover tx fees)
    const feeReserve = route.fromNetwork.type === "bitcoin" ? FEE_RESERVE_BTC : 0;
    return Math.max(0, bal - feeReserve);
  }, [balance, route.fromNetwork.type]);

  // Get minimum amount based on direction
  const minAmount = mode === "deposit" ? MIN_DEPOSIT_BTC : MIN_WITHDRAW_BTC;
  const minAmountSats = mode === "deposit" ? MIN_DEPOSIT_SATS : MIN_WITHDRAW_SATS;

  // calculate net receive in sats
  const amountInSats = Math.floor(amountNumber * 100_000_000);
  const netReceive = Math.max(0, amountInSats - (storeFeeEstimation?.fee ?? 0));

  // validation
  const hasAmount = amount.trim().length > 0 && amountNumber > 0;
  const isAmountValid = hasAmount && amountNumber >= minAmount;
  const isAmountBelowMin = hasAmount && amountNumber < minAmount;
  
  const hasRecipientAddress = recipientAddress.trim().length > 0;

  // validate the recipient address based on destination network
  const isRecipientValid = useMemo(() => {
    if (!hasRecipientAddress) return false;
    return verifyRecipientAddress(recipientAddress, route.toNetwork.type);
  }, [recipientAddress, route.toNetwork.type, hasRecipientAddress]);

  const canSubmit = isAmountValid && isRecipientValid && !isSubmitting;

  // validation message for the button
  const validationMessage = !hasRecipientAddress
    ? "Connect wallet or enter address manually"
    : !isRecipientValid
      ? `Enter a valid ${route.toNetwork.displayName} address`
      : !hasAmount
        ? "Enter transfer amount"
        : isAmountBelowMin
          ? `Minimum amount is ${minAmount} BTC (${minAmountSats.toLocaleString()} sats)` // TODO support token symbol instead of BTC
          : "";

  const handleChangeMode = (newMode: BridgeMode) => {
    setMode(newMode);
    setAmount("");
    setRecipientAddress("");
  };

  const handleMaxAmount = () => {
    setAmount(maxAmount.toFixed(8));
  };

  const handleSliderChange = (value: number) => {
    setAmount(value.toFixed(8));
  };

  const handleSwap = () => {
    setMode(mode === "deposit" ? "withdraw" : "deposit");
    setAmount("");
    setRecipientAddress("");
  };

// Handle reset after a successful transaction
  const handleReset = () => {
    resetSubmit();
    setAmount("");
    setRecipientAddress("");
  };

  const handleSubmit = async  (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setApprovalOpen(true);

    await submit({
      route,
      amount,
      amountNumber,
      recipientAddress,
      bitcoinAddress,
      bitcoinPublicKey,
    });

    setApprovalOpen(false);
  };

  const handleCancelTransfer = () => {
    cancel();
    setApprovalOpen(false);
  };

  return (
    <div className={cn("w-full flex justify-center py-8 px-4", className)}>
      <div className="w-full max-w-4xl">
      {/*Mode tabs*/}
      <BridgeModeTabs mode={mode} onModeChange={handleChangeMode} />

      {/*Card container*/}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        {/*Title*/}
        <div className="text-center mb-4 pt-8 px-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Via Network Bridge</h1>
          <p className="text-sm text-slate-600">Bridge assets securely</p>
        </div>
        <form onSubmit={handleSubmit} className="px-8 pb-8">
          {/*Network Lane*/}
          <NetworkLaneSelector route={route} onSwap={handleSwap} />

          {/*Amount section*/}
          <div className="space-y-6 mb-8">
            <TransferAmountInput value={amount} onChange={setAmount} onMax={handleMaxAmount} unit={unit} maxDisabled={!balance || parseFloat(balance) <= 0}/>
          </div>

          <div className="mb-6">
            <AvailableBalanceDisplay balance={balance} unit={unit} isLoading={isLoadingBalance} />
          </div>

          <div className="mb-6">
            <AmountSlider value={amountNumber} max={maxAmount} onChange={handleSliderChange} unit={unit}/>
          </div>

          {/*Transaction Summary*/}
          <div className="mb-8">
            <TransactionSummaryCard amount={amount} fee={`${storeFeeEstimation?.fee ?? 0} sats`} netReceive={(netReceive / 100_000_000).toFixed(8)} unit={unit}/>
          </div>

          {/*Recipient Address*/}
          <RecipientAddressSection route={route} value={recipientAddress} onChange={setRecipientAddress} />

          {/*Submit button*/}
          <BridgeSubmitButton mode={mode} canSubmit={canSubmit} isSubmitting={isSubmitting} validationMessage={validationMessage}/>

        </form>

        <ApprovalModal open={approvalOpen} onOpenChange={setApprovalOpen} onCancel={handleCancelTransfer} direction={mode} title="Waiting for Approval"
        transactionData={{
          fromAmount: amount,
          toAmount: storeFeeEstimation ? ((amountInSats - storeFeeEstimation.fee) / 100_000_000).toFixed(8) : undefined,
          fromToken: route.token,
          toToken: route.token,
          fromNetwork: route.fromNetwork,
          toNetwork: route.toNetwork,
          recipientAddress,
          networkFee: storeFeeEstimation ? `${storeFeeEstimation.fee.toLocaleString()} sats` : undefined,
        }}
        />

        {/* Success Dialog */}
        <TransactionSuccessDialog
          open={successResult !== null}
          onOpenChange={(open) => !open && handleReset()}
          result={successResult}
          onReset={handleReset}
        />
      </div>
      </div>
    </div>
  );
}
