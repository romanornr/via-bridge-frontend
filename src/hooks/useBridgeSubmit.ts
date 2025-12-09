import { useState, useCallback, useRef } from "react";
import { executeDeposit } from "@/services/bridge/deposit";
import { executeWithdraw } from "@/services/bridge/withdraw";
import { useWalletStore } from "@/store/wallet-store";
import { toast } from "sonner";
import { isAbortError } from "@/utils/promise";
import type { BridgeRoute } from "@/services/bridge/types";

/**
 * Result of a successful bridge transaction
 */
export interface TransactionResult {
  txHash: string;
  explorerUrl: string;
  type: "deposit" | "withdraw";
  amount: string;
  /** Token symbol (e.g., "BTC", "USDC", "USDT") - supports future multi-asset bridging */
  tokenSymbol: string;
}

/**
 * Parameters for submitting a bridge transaction
 */
interface SubmitParams {
  route: BridgeRoute;
  amount: string;
  amountNumber: number;
  recipientAddress: string;
  bitcoinAddress: string | null;
  bitcoinPublicKey: string | null;
}

/**
 * Return type for the useBridgeSubmit hook
 */
interface UseBridgeSubmitResult {
  /** Whether a submission is in progress */
  isSubmitting: boolean;
  /** Result of successful transaction (null if none or reset) */
  successResult: TransactionResult | null;
  /** Submit a bridge transaction */
  submit: (params: SubmitParams) => Promise<void>;
  /** Reset success state to allow new transaction */
  reset: () => void;
  /** Cancel an in-progress transaction */
  cancel: () => void;
}

/**
 * Hook to manage bridge transaction submission
 * 
 * Handles:
 * - Deposit transactions
 * - Withdraw transactions
 * - Transaction tracking via addLocalTransaction
 * - Success state management
 * - Cancellation via AbortController
 * 
 * @example
 * ```tsx
 * const { isSubmitting, successResult, submit, reset, cancel } = useBridgeSubmit();
 * 
 * // Submit a transaction
 * await submit({ route, amount, amountNumber, recipientAddress, bitcoinAddress, bitcoinPublicKey });
 * 
 * // Check for success
 * if (successResult) {
 *   // Show success UI with successResult.txHash, successResult.explorerUrl
 * }
 * 
 * // Reset to make another transaction
 * reset();
 * ```
 */
export function useBridgeSubmit(): UseBridgeSubmitResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<TransactionResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { addLocalTransaction } = useWalletStore();

  const submit = useCallback(async (params: SubmitParams) => {
    const { route, amount, amountNumber, recipientAddress, bitcoinAddress, bitcoinPublicKey } = params;

    // Create abort controller for cancellation
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsSubmitting(true);

    try {
      const sourceNetworkType = route.fromNetwork.type;
      const direction = route.direction;

      // CASE 1: Bitcoin → VIA deposit
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

        // Track transaction locally
        addLocalTransaction({
          type: "deposit",
          amount,
          status: "Pending",
          txHash: result.txId,
          l1ExplorerUrl: result.explorerUrl,
        });

        // Set success result
        setSuccessResult({
          txHash: result.txId,
          explorerUrl: result.explorerUrl,
          type: "deposit",
          amount,
          tokenSymbol: route.token.symbol,
        });

        toast.success("Deposit submitted", { description: `Transaction: ${result.txId}` });

      // CASE 2: VIA → Bitcoin withdrawal
      } else if (sourceNetworkType === "evm" && direction === "withdraw") {
        if (route.toNetwork.type === "bitcoin") {
          const result = await executeWithdraw({
            amount,
            recipientBitcoinAddress: recipientAddress,
            signal: controller.signal,
          });

          // Track transaction locally
          addLocalTransaction({
            type: "withdraw",
            amount,
            status: "Pending",
            txHash: result.txHash,
            l2ExplorerUrl: result.explorerUrl,
          });

          // Set success result
          setSuccessResult({
            txHash: result.txHash,
            explorerUrl: result.explorerUrl,
            type: "withdraw",
            amount,
            tokenSymbol: route.token.symbol,
          });

          toast.success("Withdrawal submitted!", { description: `Transaction: ${result.txHash}` });

        } else if (route.toNetwork.type === "evm") {
          // Future: VIA → Ethereum withdrawal
          throw new Error(`Ethereum withdrawals not yet supported: ${route.id}`);
        }

      // CASE 3: Ethereum → VIA deposit (future)
      } else if (sourceNetworkType === "evm" && direction === "deposit") {
        throw new Error(`Unsupported route: ${route.id}`);

      // CASE 4: Unknown route
      } else {
        throw new Error(`Unsupported route configuration: ${route.id}`);
      }

    } catch (error) {
      console.error("Submit error:", error);
      if (isAbortError(error)) {
        toast.info("Transfer cancelled");
      } else {
        toast.error("Transfer failed", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } finally {
      setIsSubmitting(false);
      abortControllerRef.current = null;
    }
  }, [addLocalTransaction]);

  const reset = useCallback(() => {
    setSuccessResult(null);
  }, []);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    isSubmitting,
    successResult,
    submit,
    reset,
    cancel,
  };
}
