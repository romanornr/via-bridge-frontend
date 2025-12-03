// src/components/bridge/bridge-submit-button.tsx
"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { BridgeMode } from "./bridge-mode-tabs";

interface BridgeSubmitButtonProps {
  /** Bridge mode for label */
  mode: BridgeMode;
  /** Whether the form is valid can be submitted */
  canSubmit: boolean;
  /** Whether submission is in progress */
  isSubmitting: boolean;
  /** Message to show when canSubmit is false */
  validationMessage: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Bridge Submit Button
 *
 * @example
 * ```tsx
 * <BridgeSubmitButton mode="deposit" canSubmit={isValid} isSubmitting={isSubmitting} validationMessage = "Enter deposit amount" />
 * ```
 */
export function BridgeSubmitButton({mode, canSubmit, isSubmitting, validationMessage, className}: BridgeSubmitButtonProps) {
  const actionLabel = mode === "deposit" ? "Initiate Deposit" : "Initiate Withdrawal";
  const label = canSubmit ? actionLabel : (validationMessage ?? "Enter transfer details to continue");

  return (
    <button type="submit" disabled={!canSubmit || isSubmitting} className={cn("w-full py-4 rounded-md font-semibold text-base transition-colors", canSubmit && !isSubmitting ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-slate-300 text-slate-500 cursor-not-allowed", className)}>
      {isSubmitting ? (
        <span className="flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Processing...
        </span>
        ) : (
          label
        )}
    </button>
  );
}
