// src/components/withdraw-form.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { GetCurrentRoute} from "@/services/bridge/routes";
import { BRIDGE_CONFIG } from "@/services/config";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, ExternalLink, HelpCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { executeWithdraw } from "@/services/bridge/withdraw";
import { useWalletStore } from "@/store/wallet-store";
import { getViaBalance } from "@/services/via/balance";
import { cn } from "@/lib/utils";
import { toL1Amount } from "@/helpers";
import { FormAmountSlider } from "@/components/form-amount-slider";
import { MIN_WITHDRAW_BTC, MIN_WITHDRAW_SATS } from "@/services/constants";
import { useDebounce } from "@/hooks/useDebounce";
import NetworkRouteBanner from "@/components/ui/network-route-banner";
import AddressFieldWithWallet from "@/components/address-field-with-wallet";
import { verifyBitcoinAddress } from "@/utils/address";
import ApprovalModal from "@/components/approval-modal";
import { L1_BTC_DECIMALS } from "@/services/constants";
import { isAbortError } from "@/utils/promise";

interface WithdrawFormProps {
  viaAddress: string | null
  onTransactionSubmitted: () => void;
}

const withdrawFormSchema = z.object({
  amount: z
    .string()
    .refine((val) => {
      const v = String(val ?? "").trim();
      if (!v) return true; // no error when empty; defer to user interaction/submit
      const n = Number.parseFloat(v);
      return Number.isFinite(n) && n >= MIN_WITHDRAW_BTC;
    }, {
      message: `Minimum amount is ${MIN_WITHDRAW_BTC} BTC (${MIN_WITHDRAW_SATS.toLocaleString()} sats)`,
    }),
  recipientBitcoinAddress: z
    .string()
    .trim()
    .refine((val) => val.length === 0 || verifyBitcoinAddress(val), {
      message: "invalid Bitcoin address",
    }),  // TODO: Add support for Bitcoin address formats other than Bech32 (SegWit)
});

export default function WithdrawForm({ viaAddress, onTransactionSubmitted }: WithdrawFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [amount, setAmount] = useState("0");
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  // Cleanup any-inflight operation if component unmounts'
  useEffect(() => {
    return () => {
      abortController?.abort() ;
    };
  }, [abortController]);

  // Get the current bridge route configuration
  const bridgeRoute = GetCurrentRoute('withdraw', BRIDGE_CONFIG.defaultNetwork);
  const { fromNetwork, toNetwork, token } = bridgeRoute;

  // Calculate net BTC amount after fee estimation
  const calculateNetBTCAmount = (amountBtc: string, fee: number) => {
    const amountSats = toL1Amount(amountBtc);
    const netSats = amountSats - fee;
    return (netSats / Math.pow(10, L1_BTC_DECIMALS)).toFixed(8);
  };

  // Import the wallet store to get the Bitcoin address
  const { addLocalTransaction, isLoadingFeeEstimation, feeEstimation, fetchFeeEstimation, resetFeeEstimation } = useWalletStore();

  const form = useForm<z.infer<typeof withdrawFormSchema>>({
    resolver: zodResolver(withdrawFormSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      amount: "",
      recipientBitcoinAddress: "",
    },
  });

  // Fetch VIA balance when address is available
  useEffect(() => {
    async function fetchBalance() {
      if (!viaAddress) return;

      try {
        setIsLoadingBalance(true);
        const balanceInBtc = await getViaBalance(viaAddress);
        setBalance(balanceInBtc);
      } catch (error) {
        console.error("Error fetching balance:", error);
        toast.error("Failed to fetch balance", {
          description: "Could not retrieve your VIA balance. Please try again later.",
        });
      } finally {
        setIsLoadingBalance(false);
      }
    }

    fetchBalance();
  }, [viaAddress]);

    const liveAmount = form.watch("amount");
    const debouncedAmount = useDebounce(liveAmount, 600); // 600ms debounce delay
    const lastSatsRef = useRef<number | null>(null);
    useEffect(() => {
        setAmount(String(liveAmount ?? ""));
        }, [liveAmount]);
    useEffect(() => {
        try {
            const str = String(debouncedAmount ?? "").trim();
          if (!str) return;  // if the user hasn't typed a number yet, don't do anything'
          const sats = toL1Amount(str);
            if (!Number.isFinite(sats)) return;
            if (sats  <= 0 ) return;
            if (sats <  MIN_WITHDRAW_SATS) return;  // 0.00002 BTC minimum
            if (lastSatsRef.current === sats) return;
            lastSatsRef.current = sats;
            fetchFeeEstimation(sats);
        } catch (err) {
            console.error("Error fetching fee estimation:", err);
        }
    }, [debouncedAmount, fetchFeeEstimation]);

    // Check that net sats >= 0 when both amount and fee are known
    const netSats =
      feeEstimation
        ? toL1Amount((amount || "0")) - feeEstimation.fee
        : 0;
    const insufficientNet = feeEstimation ? netSats < 0 : false;
    const hasAmount = Boolean((form.watch("amount") || "").trim());

    // handle cancellation from approval modal
  const handleCancelWithdraw = () => {
    if (abortController) abortController.abort();
  };

  // Derived form validity for CTA state
  const recipient = form.watch("recipientBitcoinAddress");
  const recipientValid = verifyBitcoinAddress(recipient);
  const amountStr = form.watch("amount") || "0" ;
  const amountValid =
    parseFloat(amountStr) >= MIN_WITHDRAW_BTC &&
    (!balance || parseFloat(amountStr) <= parseFloat(balance));

  const canSubmit = amountValid && recipientValid;
  const ctaLabel = canSubmit ? "Withdraw" : (!recipient ? "Connect wallet or enter address" : (recipientValid ? "Enter withdraw amount" : "Enter a valid BTC address"));

  async function onSubmit(values: z.infer<typeof withdrawFormSchema>) {
    if (isSubmitting) return; // prevent concurrent submissions
    if (!viaAddress) {
      toast.error("VIA address is required", {description: "Please connect your VIA wallet to proceed with the withdrawal.",});
      return;
  }

    try {
      setIsSubmitting(true);
      if (!verifyBitcoinAddress(values.recipientBitcoinAddress)) {
        // Do not show a toast for empty input; UI already guides the user
        if ((values.recipientBitcoinAddress || "").trim().length === 0) {
          setIsSubmitting(false);
          return;
        }
        toast.error("Invalid Bitcoin address", {description: "Please enter a valid Bitcoin address or connect your wallet to autofill.",});
        setIsSubmitting(false);
        return;
      }

      const controller = new AbortController();
      setAbortController(controller);
      setApprovalOpen(true);

      const result = await executeWithdraw({
        amount: values.amount,
        recipientBitcoinAddress: values.recipientBitcoinAddress,
        signal: controller.signal,
      });
      setTxHash(result.txHash);
      setExplorerUrl(result.explorerUrl);
      addLocalTransaction({
        type: 'withdraw',
        amount: values.amount,
        status: 'Pending',
        txHash: result.txHash,
        l2ExplorerUrl: result.explorerUrl
      });
      setIsSuccess(true);
      toast.success("Withdrawal Transaction Broadcast", {
        description: "Your withdrawal transaction has been submitted to the VIA network.",
        duration: 5000,
        className: "text-base font-medium",
      });

      onTransactionSubmitted();
    } catch (error) {
      console.error("Withdrawal error:", error);
      if (isAbortError(error)) {
        toast.info("Withdrawal cancelled", {
          description: "You cancelled the withdrawal transaction.",
        });
        return;
      }
    } finally {
      setIsSubmitting(false);
      setApprovalOpen(false);
      setAbortController(null);
    }
  }

  if (isSuccess && txHash && explorerUrl) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="w-full max-w-md p-4">
          <div className="bg-background border border-border/50 rounded-lg shadow-lg p-6">
            <div className="space-y-8">
              <div className="text-center space-y-4">
                <div className="h-16 w-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto ring-1 ring-green-500/30">
                  <svg
                    className="h-8 w-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold tracking-tight">Withdrawal Transaction Submitted</h3>
                  <p className="text-muted-foreground text-sm">
                    Your withdrawal transaction has been submitted to the VIA network and it is being processed.
                    Receiving BTC on the Bitcoin network can take up to 24 hours, please be patient.
                  </p>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-4 border border-border/50">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Transaction Hash</p>
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium"
                    >
                      View on Explorer
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <p className="font-mono text-xs bg-background/80 p-3 rounded-md break-all text-muted-foreground">
                    {txHash}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  className="w-full"
                  onClick={() => {
                    setIsSuccess(false);
                    setTxHash(null);
                    setExplorerUrl(null);
                    resetFeeEstimation();
                    lastSatsRef.current = null;
                    form.reset();
                  }}
                >
                  Make Another Withdrawal
                </Button>
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full"
                >
                  <Button variant="outline" className="w-full">
                    Track Transaction
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md min-w-[300px] sm:min-w-[360px] mx-auto">
      <NetworkRouteBanner direction="withdraw" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <div className="flex justify-between items-center">
                  <FormLabel className="text-sm">BTC Amount</FormLabel>
                </div>

                <FormControl>
                  <div className="relative">
                    <Input
                      placeholder="0.001"
                      step="any"
                      type="number"
                      inputMode="decimal"
                      className={cn(
                        "placeholder:text-muted-foreground/60 pr-16", // space inside input for the button
                        field.value &&
                        balance &&
                        parseFloat(field.value) > parseFloat(String(balance)) &&
                        "border-red-500 focus-visible:ring-red-500"
                      )}
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (balance) {
                            form.setValue("amount", String(balance));
                        }
                      }}
                      disabled={
                        isLoadingBalance || !balance || parseFloat(String(balance)) <= 0
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[10px] font-semibold rounded bg-blue-100 text-blue-600 hover:bg-blue-200 disabled:opacity-50 mr-2"
                    >
                      MAX
                    </button>
                  </div>
                </FormControl>
                {((form.formState.touchedFields.amount || form.formState.isSubmitted) &&
                  String(form.getValues("amount") || "").trim().length > 0) && (
                  <FormMessage />
                )}

                {balance && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    Balance:{" "}
                    {isLoadingBalance ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <span
                        className={cn(
                          "font-medium",
                          field.value &&
                          Number(field.value) > Number(balance) &&
                          "text-red-500",
                          field.value &&
                          Number(field.value) > Number(balance) * 0.95 &&
                          "text-amber-500"
                        )}
                      >
                        {(Number(balance)).toFixed(4)} BTC
                      </span>
                    )}
                  </div>
                )}

                {/* Alert when balance is zero */}
                {balance && Number(balance) === 0 && (
                  <Alert className="mt-3 bg-amber-50 border-amber-200">
                    <AlertDescription className="text-amber-800 text-sm">
                      Your VIA balance is empty. Ensure you have the correct wallet connected or deposit BTC first to make withdrawals.
                    </AlertDescription>
                  </Alert>
                )}

                {/* balance usage progress */}
                {balance && Number(balance) >0 && (
                  <FormAmountSlider
                    form={form}
                    name="amount"
                    balance={Number.parseFloat(String(balance))}
                    min={MIN_WITHDRAW_BTC}
                    feeReserve={0}
                    isLoading={isLoadingBalance}
                    pulseWhenEmpty={!(field.value && String(field.value).trim())}
                    unit="BTC"
                    progressClassName="bg-green-500"
                    sliderAccentClassName="accent-green-500"
                    ariaLabel="Withdraw amount"
                    decimals={8}
                    />
                )}

                {field.value && (
                  <div className="text-xs text-muted-foreground mt-4 min-h-[1rem]">
                    {isLoadingFeeEstimation ? (
                      <div className="w-48 h-4 rounded bg-muted animate-pulse" />
                    ) : feeEstimation !== null && (
                      <div className="border border-muted rounded-md bg-muted/40 px-4 py-3 space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            Estimated network fee:{" "}
                            <span className="font-medium text-foreground">
                              {feeEstimation.fee.toLocaleString()} sats
                            </span>
                          </div>
                          {/* Custom Tooltip */}
                          <div className="relative group">
                            <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 transform sm:left-auto sm:right-0 sm:translate-x-0 mb-2 px-2 py-1.5 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 w-64 shadow-lg border border-gray-700 pointer-events-none">
                              <div className="text-left leading-snug">
                                This is the estimated fee required to process your withdrawal through the verifier network. Any unused amount will be refunded to your wallet.
                              </div>
                            </div>
                          </div>
                        </div>

                        {(() => {
                          const btcAmount = Math.max(0, toL1Amount(amount || "0") - feeEstimation.fee);

                          const getColorClass = (amount: number) => {
                            if (amount < 250) return "text-red-500";
                            if (amount < 1000) return "text-orange-500";
                            return "text-green-500";
                          };

                          const colorClass = getColorClass(btcAmount);

                          return (
                            <div className={`text-xs ${colorClass}`}>
                              Minimum BTC you will receive:{" "}
                              <span className={`font-medium ${colorClass}`}>
                                {btcAmount.toLocaleString()} sats
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </FormItem>
            )}
          />
          
          <FormField control={form.control} name="recipientBitcoinAddress" render={({ field }) => (
              <FormItem>
                <AddressFieldWithWallet mode="bitcoin" label="Recipient Bitcoin Address" placeholder="bc1..." value={field.value || ""} onChange={field.onChange}/>
                {(form.formState.isSubmitted || (form.formState.dirtyFields.recipientBitcoinAddress && String(form.getValues("recipientBitcoinAddress") || "").trim().length > 0)
                ) && (
                  <FormMessage />
                )}
              </FormItem>
            )}
          />
          {txHash && (
            <Alert className="bg-primary/5 border-primary/10">
              <AlertDescription className="text-sm break-all text-primary/80">
                Transaction submitted: {txHash}
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          {hasAmount && insufficientNet && (<div className="text-xs text-red-500 text-center">Insufficient balance after fees</div>)}
          <Button type="submit" className="w-full" disabled={isSubmitting || !canSubmit}
                  aria-disabled={isSubmitting || !canSubmit} title={!canSubmit ? ctaLabel: undefined}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              ctaLabel
            )}
          </Button>
        </form>
      </Form>
      <ApprovalModal
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        onCancel={handleCancelWithdraw}
        direction="withdraw"
        title='Waiting for approval'
        transactionData={{
          fromAmount: form.getValues("amount") || "0",
          toAmount: feeEstimation ? calculateNetBTCAmount(form.getValues("amount") || "0", feeEstimation.fee): undefined,
          fromNetwork: fromNetwork,
          toToken: token,
          toNetwork: toNetwork,
          fromToken: token,
          recipientAddress: form.getValues("recipientBitcoinAddress") || "",
          networkFee: feeEstimation ? `${feeEstimation.fee.toLocaleString()} sats` : undefined,
        }}
        />
    </div>
  );
}
