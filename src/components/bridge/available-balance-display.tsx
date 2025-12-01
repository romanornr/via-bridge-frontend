// src/components/bridge/available-balance-display.tsx
"use client"
import { cn } from "@/lib/utils";

interface AvailableBalanceDisplayProps {
  /** Balance amount as string (e.g., "0.00135832") */
  balance: string | null
  /** Unit to display (e.g., "BTC", "VIA", "USDC") */
  unit: string;
  /** Whether balance is loading */
  isLoading?: boolean;
  className?: string;
}

/**
 * Available Balance Display
 *
 * Shows the user's available balance in a highlighted info box
 *
 * @example
 * ```tsx
 * <AvailableBalanceDisplay balance="0.00135832" unit="BTC" isLoading={isLoadingBalance} />
 * ```
 */
export function AvailableBalanceDisplay({balance, unit, isLoading, className} : AvailableBalanceDisplayProps) {
  return (
    <div className={cn("bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 shadow-sm", className)}>
      <div className="flex items-center justify-between">
        {/*Label*/}
        <span className="text-sm font-medium text-slate-600">Available Balance</span>

        {/*Value*/}
        {isLoading ? (
          // Skeleton loader
          <div className="w-32 h-6 rounded bg-blue-100 animate-pulse" />
        ) : (
          <span className="text-base font-bold text-slate-900 tabular-nums"> {balance ??  "0.00000000"} {unit}</span> // If balance is null, show "0.00000000"
        )}
      </div>
    </div>
  );
}