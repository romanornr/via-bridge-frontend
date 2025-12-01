// src/components/bridge/transaction-summary-card.tsx
"use client";
import { cn } from "@/lib/utils";

interface TransactionSummaryCardProps {
  /** Transfer amount as string (e.g., "0.00064965") */
  amount: string;
  /** Network fee as string (e.g., "100 sats") */
  fee: string;
  /** Net amount to receive as string (e.g., "0.00064865") */
  netReceive: string;
  /** Unit to display (e.g, "BTC", "USDC" */
  unit: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Transaction Summary Card
 *
 * Display a breakdown of the transaction
 * - Transfer amount
 * - Network fee
 * - Net amount to receive (highlighted)
 *
 * @example
 * ```tsx
 * <TransactionSummaryCard amount="0.00064965" fee={100} netReceive={0.00064865} unit="BTC" />
 * ```
 */
export function TransactionSummaryCard({amount, fee, netReceive, unit, className} : TransactionSummaryCardProps) {
  return (
    <div className={cn("border border-slate-200 rounded-md", className)}>
      {/*Header*/}
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Transaction Summary
        </h3>
      </div>

      {/*Rows*/}
      <div className="divide-y divide-slate-200">
        {/*Transfer Amount*/}
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-slate-900">
              Transfer Amount
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Total amount being transferred
            </div>
          </div>
          <div className="text-base font-semibold text-slate-900 tabular-nums">
            {amount} {unit}
          </div>
        </div>

        {/*Network Fee*/}
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-slate-900">
              Network fee
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Required for processing on the Via Verifier Network
            </div>
          </div>
          <div className="text-base font-semibold text-slate-900 tabular-nums">
            {fee}
          </div>
        </div>

        {/*You will receive*/}
        <div className="px-5 py-4 flex items-center justify-between bg-green-50">
          <div>
            <div className="text-sm font-semibold text-green-900">
              You Will Receive
            </div>
            <div className="text-xs text-green-700 mt-0.5">Amount credited to destination address</div>
          </div>
          <div className="text-lg font-bold text-green-900 tabular-nums">{netReceive} {unit}</div>
        </div>
      </div>
    </div>
  );
}
