// src/components/bridge/transaction-success-dialog.tsx
"use client";

import { ExternalLink, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { TransactionResult } from "@/hooks/useBridgeSubmit";

interface TransactionSuccessDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** The transaction result to display */
  result: TransactionResult | null;
  /** Callback when user wants to make another transaction */
  onReset: () => void;
}

/**
 * Dialog component to display successful transaction details
 *
 * Uses shadcn/ui Dialog for consistent styling and accessibility.
 * Shows transaction hash, explorer link, and action buttons.
 * Supports multiple token types (BTC, USDC, USDT, etc.) via tokenSymbol.
 *
 * @example
 * ```tsx
 * <TransactionSuccessDialog
 *   open={successResult !== null}
 *   onOpenChange={(open) => !open && handleReset()}
 *   result={successResult}
 *   onReset={handleReset}
 * />
 * ```
 */
export function TransactionSuccessDialog({
  open,
  onOpenChange,
  result,
  onReset,
}: TransactionSuccessDialogProps) {
  if (!result) return null;

  const { txHash, explorerUrl, type, amount, tokenSymbol } = result;
  const isDeposit = type === "deposit";

  const handleMakeAnother = () => {
    onReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-4">
          {/* Success Icon */}
          <div className="mx-auto h-16 w-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center ring-1 ring-green-500/30">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <DialogTitle className="text-2xl font-semibold tracking-tight">
            {isDeposit ? "Deposit" : "Withdrawal"} Submitted
          </DialogTitle>

          <DialogDescription className="text-sm">
            Your {isDeposit ? "deposit" : "withdrawal"} of {amount} {tokenSymbol} has been submitted
            to the {isDeposit ? "Bitcoin" : "VIA"} network and is being processed.
            {!isDeposit && ` Receiving ${tokenSymbol} on the Bitcoin network can take up to 24 hours.`}
          </DialogDescription>
        </DialogHeader>

        {/* Transaction Hash Section */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2 border border-border/50 mt-4">
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

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 mt-6">
          <Button onClick={handleMakeAnother} className="w-full">
            Make Another {isDeposit ? "Deposit" : "Withdrawal"}
          </Button>

          <Button variant="outline" asChild className="w-full">
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2"
            >
              Track Transaction
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
