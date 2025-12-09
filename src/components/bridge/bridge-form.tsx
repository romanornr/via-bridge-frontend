// src/components/bridge/bridge-form.tsx

"use client";

import { executeDeposit } from "@/services/bridge/deposit";
import { executeWithdraw} from "@/services/bridge/withdraw";
import {useState, useMemo, useEffect} from "react";
import { cn } from "@/lib/utils";
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
  BridgeSubmitButton
} from "./index";
import {toast} from "sonner";
import {isAbortError} from "@/utils/promise";
import ApprovalModal from "@/components/approval-modal";
import {useDebounce} from "@/hooks/useDebounce";
import {toL1Amount} from "@/helpers";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [approvalOpen, setApprovalOpen] = useState(false);

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
    const feeReserve = mode === "deposit" ? 0.001 : 0;
    return Math.max(0, bal - feeReserve);
  }, [balance, mode]);

  // calculate net receive in sats
  const amountInSats = Math.floor(amountNumber * 100_000_000);
  const netReceive = Math.max(0, amountInSats - (storeFeeEstimation?.fee ?? 0));

  // validation
  const hasAmount = amount.trim().length > 0 && amountNumber > 0;
  const hasRecipientAddress = recipientAddress.trim().length > 0;

  // validate the recipient address based on destination network
  const isRecipientValid = useMemo(() => {
    if (!hasRecipientAddress) return false;
    return verifyRecipientAddress(recipientAddress, route.toNetwork.type);
  }, [recipientAddress, route.toNetwork.type, hasRecipientAddress]);

  const canSubmit = hasAmount && isRecipientValid && !isSubmitting;  // canSubmit is true when all fields are valid and the form is not submitting

  // validation message for the button
  const validationMessage = !hasRecipientAddress
    ? "Connect wallet or enter address manually"
    : !isRecipientValid
      ? `Enter a valid ${route.toNetwork.type} address`
      :!hasAmount
        ? "Enter transfer amount"
        : "";

  const handleChangeMode = (newMode: BridgeMode) => {
    setMode(newMode);
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
    setRecipientAddress("");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortController?.abort();
    };
  }, [abortController]);

  const handleSubmit = async  (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    // create abort controller for cancellation
    const controller = new AbortController();
    setAbortController(controller);
    setApprovalOpen(true);
    setIsSubmitting(true);
    try {


      // ROUTE-BASED EXECUTION LOGIC
      // We derive the execution path from route properties (not mode).
      //
      // VIA is always the hub network:
      // - All deposits go TO VIA (Bitcoin→VIA, future Ethereum→VIA)
      // - All withdrawals come FROM VIA (VIA→Bitcoin, future VIA→Ethereum)
      //
      // Key variables:
      // - sourceNetworkType: "bitcoin" | "evm" (route.fromNetwork.type)
      // - direction: "deposit" | "withdraw" (route.direction)
      // - route.toNetwork.type: destination network type for withdrawals
      // ============================================================
      const sourceNetworkType = route.fromNetwork.type;
      const direction = route.direction;

      // CASE 1: Bitcoin → VIA deposit
      // Source is Bitcoin, direction is deposit
      if (sourceNetworkType === "bitcoin" && direction === "deposit") {
        if (!bitcoinAddress || !bitcoinPublicKey) {
          throw new Error("Bitcoin wallet not connected");
        }

        const result = await executeDeposit({
          bitcoinAddress,
          bitcoinPublicKey,
          recipientViaAddress: recipientAddress.slice(2), // remove 0x prefix
          amountInBtc: amountNumber,
          signal: controller.signal,
        });

        toast.success("Deposit submitted", { description: `Transaction: ${result.txId}` });

      // CASE 2: VIA → external network withdrawal
      // Source is EVM (VIA), direction is withdraw
      // Check route.toNetwork.type to determine destination
      } else if (sourceNetworkType === "evm" && direction === "withdraw") {
        // CASE 2a: VIA → Bitcoin withdrawal
        if (route.toNetwork.type === "bitcoin") {
          const result = await executeWithdraw({
            amount,
            recipientBitcoinAddress: recipientAddress,
            signal: controller.signal,
          });
          toast.success("withdrawal submitted!", { description: `Transaction: ${result.txHash}`});
        // CASE 2b: VIA → Ethereum withdrawal (future)
        } else if (route.toNetwork.type === "evm") {
          // TODO: Implement executeEthereumWithdraw when Ethereum support is added
          throw new Error(`Ethereum withdrawals not yet supported: ${route.id}`);
        }

      // CASE 3: Ethereum → VIA deposit (future)
      // Source is EVM but not VIA (i.e., Ethereum), direction is deposit
      } else if (sourceNetworkType === "evm" && direction === "deposit") {
        if (route.fromNetwork.id.startsWith("ethereum-")) {
          // TODO: Implement executeEthereumDeposit when Ethereum support is added
          // await executeEthereumDeposit({...})
        }
        throw new Error(`Unsupported route: ${route.id}`);

      // CASE 4: Unknown/unsupported route configuration
      } else {
        throw new  Error(`Unsupported route configuration: ${route.id}`);
      }

      // reset amount
      setAmount("");
      setRecipientAddress("");
    } catch (error) {
      console.error("Submit error:", error);
      if (isAbortError(error)) {
        toast.info("Transfer cancelled");
      }
      toast.error("Transfer failed", { description: error instanceof Error ? error.message : "unknown error" });
    } finally {
      setIsSubmitting(false);
      setApprovalOpen(false);
      setAbortController(null);
    }
  };

  const handleCancelTransfer = () => {
    abortController?.abort();
  };

  return (
    <div className={cn("min-h-screen bg-white flex items-center justify-center p-6", className)}>
      <div className="w-full max-w-3xl">
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
      </div>
      </div>
    </div>
  );
}
