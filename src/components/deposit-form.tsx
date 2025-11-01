"use client";

import { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ExternalLink, Loader2, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { executeDeposit } from "@/services/bridge/deposit";
import { getBitcoinBalance } from "@/services/bitcoin/balance";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useWalletStore } from "@/store/wallet-store";
import { getAddress } from "ethers";
import { SYSTEM_CONTRACTS_ADDRESSES_RANGE, L1_BTC_DECIMALS, FEE_RESERVE_BTC, MIN_DEPOSIT_BTC, MIN_DEPOSIT_SATS } from "@/services/constants";
import { cn } from "@/lib/utils";
import { BRIDGE_CONFIG } from "@/services/config";
import { FormAmountSlider } from "@/components/form-amount-slider";
import { useDebounce } from "@/hooks/useDebounce";
import NetworkRouteBanner from "@/components/ui/network-route-banner";
import AddressFieldWithWallet from "@/components/address-field-with-wallet";
import { toL1Amount } from "@/helpers";

interface DepositFormProps {
  bitcoinAddress: string | null
  bitcoinPublicKey: string | null
  onDisconnect: () => void
  onTransactionSubmitted: () => void;
}

interface FormContext {
  _balance?: string;
}

const depositFormSchema = z.object({
  amount: z
    .string()
    .refine((val) => {
      const v = String(val ?? "").trim();
      if (!v) return true; // don’t error on empty; defer to UX/submit
      const n = Number.parseFloat(v);
      return Number.isFinite(n) && n >= MIN_DEPOSIT_BTC;
    }, {
      message: `Minimum amount is ${MIN_DEPOSIT_BTC} BTC (${MIN_DEPOSIT_SATS.toLocaleString()} sats)`,
    })
    .superRefine((val, ctx) => {
      // Get balance from context
      const formValues = ctx.path[0] as FormContext;
      const balance = formValues?._balance ? parseFloat(formValues._balance) : 0;

      // Skip validation if no balance available
      if (balance <= 0) return;

      // Check if amount exceeds balance
      if (Number.parseFloat(val) > balance) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Amount exceeds available balance",
        });
      }
    }),
  recipientViaAddress: z
    .string()
    .min(1, { message: "VIA address is required" })
    .refine((val) => {
      return verifyRecipientAddress(val);
    }, {
      message: "Invalid recipient address.",
    }),
});

const verifyRecipientAddress = (address: string): boolean => {
  try {
    const normalizedAddress = getAddress(address);
    // check if the recipientAddress is not a system contract address
    const invalidReceiverBn = BigInt(SYSTEM_CONTRACTS_ADDRESSES_RANGE);
    const recipientAddressBn = BigInt(normalizedAddress);
    return recipientAddressBn > invalidReceiverBn; // Reject reserved/system addresses by numeric threshold
  } catch {
    return false;
  }
};

export default function DepositForm({ bitcoinAddress, bitcoinPublicKey, onTransactionSubmitted }: DepositFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Import the wallet store to get the VIA address
  const { addLocalTransaction, isLoadingFeeEstimation, feeEstimation, fetchDepositFeeEstimation, resetFeeEstimation } = useWalletStore();

  const form = useForm<z.infer<typeof depositFormSchema> & FormContext>({
    resolver: zodResolver(depositFormSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      amount: "",
      recipientViaAddress: "",
      _balance: "0",
    },
  });

  // Update balance in form values when it changes
  useEffect(() => {
    if (balance) {
      form.setValue("_balance" as any, balance);
    }
  }, [balance, form]);

  // Recipient VIA address is managed by AddressFieldWithWallet (connect + autofill + manual override)

  // Fetch Bitcoin balance when address is available
  useEffect(() => {
    async function fetchBalance() {
      if (!bitcoinAddress) return;

      try {
        setIsLoadingBalance(true);
        const balanceInSats = await getBitcoinBalance(bitcoinAddress);
        // Convert from satoshis to BTC
        const balanceInBtc = (balanceInSats / Math.pow(10, L1_BTC_DECIMALS)).toFixed(8);
        setBalance(balanceInBtc);
      } catch (error) {
        console.error("Error fetching balance:", error);
        toast.error("Failed to fetch balance", { description: "Could not retrieve your Bitcoin balance. Please try again later.", });
      } finally {
        setIsLoadingBalance(false);
      }
    }

    fetchBalance();
  }, [bitcoinAddress]);

  // Live amount debounced to avoid unnecessary re-renders
  const [amount, setAmount] = useState("0");
  const liveAmount = form.watch("amount");
  const debouncedAmount = useDebounce(liveAmount, 600);
  const lastSatsRef = useRef<number | null>(null);
  useEffect(() => {
    setAmount(String(liveAmount ?? ""));
  }, [liveAmount]);
  useEffect(() => {
    try {
      const str = String(debouncedAmount ?? "").trim();
      if (!str) return;
      const sats = toL1Amount(str);
      if (!Number.isFinite(sats)) return;
      if (sats <= 0) return;
      if (sats < MIN_DEPOSIT_SATS) return;
      if (lastSatsRef.current === sats) return;
      lastSatsRef.current = sats;
      fetchDepositFeeEstimation(sats); // deposit fee depnds on gas limit * live gas price
    } catch (err) {
      console.error("Error fetching fee estimation:", err);
    }
  }, [debouncedAmount, fetchDepositFeeEstimation]);

  // Function to handle max amount button click
  const handleMaxAmount = () => {
    if (balance) {
      // Set a slightly lower amount to account for transaction fees
      const maxAmount = Math.max(0, parseFloat(balance) - FEE_RESERVE_BTC).toFixed(8);
      form.setValue("amount", maxAmount);
    }
  };

  // Derived form validity for CTA state
  const recipient = form.watch("recipientViaAddress");
  const recipientValid = verifyRecipientAddress(recipient);
  const amountStr = form.watch("amount") || "0";
  const amountValid =
    parseFloat(amountStr) >= MIN_DEPOSIT_BTC &&
    (!balance || parseFloat(amountStr) <= parseFloat(String(balance)));
  const canSubmit = amountValid && recipientValid;
  const ctaLabel = canSubmit ? "Deposit" : (!recipient ? "Connect wallet or enter address" : (recipientValid ? "Enter deposit amount" : "Enter a valid VIA address"));

  const netSats = feeEstimation ? toL1Amount((amount || "0")) - feeEstimation.fee : 0;
  const insufficientNet = feeEstimation ? netSats < 0 : false;
  const hasAmount = Boolean((form.watch("amount") || "").trim());

  async function onSubmit(values: z.infer<typeof depositFormSchema>) {
    try {
      setIsSubmitting(true);

      if (!verifyRecipientAddress(values.recipientViaAddress)) {
        toast.error("Invalid recipient address", { description: "Enter a valid VIA address or connect your wallet to autofill.", });
        setIsSubmitting(false);
        return;
      }

      if (!bitcoinAddress || !bitcoinPublicKey) {
        throw new Error("Bitcoin address or public key not found");
      }

      const normalizedAddress = getAddress(values.recipientViaAddress); // EIP-55 checksummed 0x address
      const recipientAddress = normalizedAddress.slice(2); // bridge API expects a raw 20-byte hex string (no "0x"), so we strip the prefix.

      // Execute the deposit
      const result = await executeDeposit({
        bitcoinAddress,
        bitcoinPublicKey,
        recipientViaAddress: recipientAddress,
        amountInBtc: Number.parseFloat(values.amount),
      });

      setTxHash(result.txId);
      setExplorerUrl(result.explorerUrl);
      setIsSuccess(true);
      toast.success("Deposit Transaction Broadcast", {
        description: "Your deposit transaction has been submitted to the Bitcoin network.",
        duration: 5000,
        className: "text-base font-medium",
      });

      // Add to onSubmit function after setting txHash and explorerUrl
      addLocalTransaction({
        type: 'deposit',
        amount: values.amount,
        status: 'Pending',
        txHash: result.txId,
        l1ExplorerUrl: result.explorerUrl
      });

      onTransactionSubmitted();

    } catch (error) {
      console.error("Deposit error:", error);
      if (error instanceof Error && error.message.includes("No UTXOs found with at least")) {
        toast("Waiting for confirmations", {
          description: `We couldn't find any UTXOs with at least ${BRIDGE_CONFIG.minBlockConfirmations} confirmations yet. Please wait for your transactions to be confirmed and try again.`,
          duration: 5000,
          className: "text-base font-medium",
        });
      } else {
        toast.error("Deposit Failed", {
          description: error instanceof Error ? error.message : "There was an error processing your deposit. Please try again.",
          duration: 5000,
          className: "text-base font-medium",
        });
      }
    } finally {
      setIsSubmitting(false);
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
                  <h3 className="text-2xl font-semibold tracking-tight">Deposit Transaction Submitted</h3>
                  <p className="text-muted-foreground text-sm">
                    Your deposit transaction has been submitted to the Bitcoin network and it is being processed
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
                      className="w-full"
                    >
                      <Button variant="outline" className="w-full">
                        Track Transaction
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
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
                  Make Another Deposit
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
      <NetworkRouteBanner direction="deposit" />
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
                        "placeholder:text-muted-foreground/60 pr-16",
                        field.value &&
                        balance &&
                        parseFloat(field.value) > parseFloat(String(balance)) &&
                        "border-red-500 focus-visible:ring-red-500"
                      )}
                      {...field}
                      onChange={(e) => {
                        // Let users type freely; keep RHF in sync
                        field.onChange(e.target.value);
                      }}
                      onBlur={() => {
                        // Mark as touched first
                        field.onBlur();
                        // Clamp to fee-aware MAX if user-entered amount exceeds it (use handleMaxAmount for consistency)
                        try {
                          if (!balance) return;
                          const bal = parseFloat(String(balance));
                          if (!Number.isFinite(bal) || bal <= 0) return;
                          const max = Math.max(0, bal - FEE_RESERVE_BTC);
                          const currentStr = form.getValues("amount") ?? "";
                          const current = parseFloat(currentStr || "0");
                          if (Number.isFinite(current) && current > max) {
                            handleMaxAmount();
                            // Ensure validation after clamping
                            // Note: RHF setValue in handleMaxAmount won't validate by default
                            form.trigger("amount");
                          }
                        } catch {
                          // no-op: keep user's value if parsing fails
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleMaxAmount}
                      disabled={
                        isLoadingBalance || !balance || parseFloat(String(balance)) <= 0
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[10px] font-semibold rounded bg-blue-100 text-blue-600 hover:bg-blue-200 disabled:opacity-50 mr-2"
                    >
                      MAX
                    </button>
                  </div>
                </FormControl>
                {(form.formState.touchedFields.amount || form.formState.isSubmitted) &&
                  String(form.getValues("amount") || "").trim().length > 0 && (
                    <FormMessage />
                  )
                }

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
                        {balance} BTC
                      </span>
                    )}
                  </div>
                )}

                {/* Alert when balance is zero */}
                {balance && Number(balance) === 0 && (
                  <Alert className="mt-3 bg-amber-50 border-amber-200">
                    <AlertDescription className="text-amber-800 text-sm">
                      Your Bitcoin balance is empty. Ensure you have the correct wallet connected or acquire BTC first to make deposits.
                    </AlertDescription>
                  </Alert>
                )}

                {/* balance usage progress and slider*/}
                {balance && Number(balance) > 0 && (
                  <FormAmountSlider
                    form={form}
                    name="amount"
                    balance={Number.parseFloat(String(balance))}
                    min={MIN_DEPOSIT_BTC}//20,000 sat min
                    feeReserve={FEE_RESERVE_BTC} // reserve for fees, aligns with MAX
                    isLoading={isLoadingBalance}
                    pulseWhenEmpty={!(field.value && String(field.value).trim())}
                    unit="BTC"
                    progressClassName="bg-green-500"
                    sliderAccentClassName="accent-green500"
                    ariaLabel="Deposit amount"
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
                          {/* Tooltip */}
                          <div className="relative group">
                            <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 transform sm:left-auto sm:right-0 sm:translate-x-0 mb-2 px-2 py-1.5 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 w-64 shadow-lg border border-gray-700 pointer-events-none">
                              <div className="text-left leading-snug">
                                This is the estimated fee required to process your deposit through the verifier network. Any unused amount will be refunded to your wallet.
                              </div>
                            </div>
                          </div>
                        </div>
                        {(() => {
                          const satsPostFee = Math.max(0, toL1Amount(amount || "0") - feeEstimation.fee);
                          const getColorClass = (sats: number) => {
                            if (sats < 250) return "text-red-500";
                            if (sats < 1000) return "text-orange-500";
                            return "text-green-500";
                          };
                          const colorClass = getColorClass(satsPostFee);
                          return (
                            <div className={`text-xs ${colorClass}`}>
                              Minimum BTC you will receive:{" "}
                              <span className={`font-medium ${colorClass}`}>
                                {satsPostFee.toLocaleString()} sats
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

          {!recipientValid && (
            <div id="recipient-requirement" className="text-xs text-muted-foreground">Enter a valid VIA address or connect your wallet to autofill.</div>
          )}

          <FormField control={form.control} name="recipientViaAddress" render={({ field }) => (
            <FormItem>
              <AddressFieldWithWallet mode="via" label="Recipient VIA Address" placeholder="0x..." value={field.value || ""} onChange={field.onChange} />
              {(form.formState.isSubmitted ||
                (form.formState.dirtyFields.recipientViaAddress &&
                  String(form.getValues("recipientViaAddress") || "").trim().length > 0)
              ) && (
                  <FormMessage />
                )}
            </FormItem>
          )}
          />

          {txHash && (
            <Alert>
              <AlertDescription className="text-sm break-all">Transaction submitted: {txHash}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            {hasAmount && insufficientNet && (
              <div className="text-xs text-red-500 text-center">Insufficient balance after fees</div>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting || !canSubmit}
              aria-disabled={isSubmitting || !canSubmit} aria-describedby={!recipientValid ? "recipient-requirement" : undefined} title={!canSubmit ? ctaLabel : undefined}
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
          </div>
        </form>
      </Form>
    </div>
  );
}
