// src/components/bridge/transfer-amount-input.tsx
"use client";

import { cn } from "@/lib/utils";

interface TransferAmountInputProps {
  value: string;
  onChange: (value: string) => void;
  onMax: () => void;
  unit: string;
  placeHolder?: string;
  maxDisabled?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Transfer Amount Input
 *
 * A styled input for entering transfer amounts with:
 * - Large, readable font for the amount
 * - Unit display (BTC/VIA) on the right
 * - MAX button to fill maximum available amount
 * - Tabular numbers for aligned digits
 *
 * @example
 * ```tsx
 * <TransferAmountInput
 *   value={amount}
 *   onChange={setAmount}
 *   onMax={handleMax}
 *   unit="BTC"
 *   maxDisabled={!balance}
 * />
 * ```
 */
export function TransferAmountInput({ value, onChange, onMax, unit, placeHolder, maxDisabled, disabled = false, className} : TransferAmountInputProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/*Label*/}
      <label className="text-sm font-medium text-slate-700 block">
        Transfer Amount
      </label>

      {/*Input row*/}
      <div className="flex-1 relative">
        <input type="text" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeHolder}  disabled={disabled}
               className={cn("w-full px-4 py-3 pr-16", "text-xl font-semibold text-slate-900 rounded-md", "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500", "tabular-nums", "disabled:bg-slate-50 disabled:text-slate-400")} />
        {/*Unit display*/}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500"> {unit}</div>
      </div>

      {/*Max button*/}
      <button type="button" onClick={onMax} disabled={maxDisabled || disabled} className={cn("px-6 py-3", "border border-slate-300 rounded-md", "text-sm font-medium text-slate-700", "hover:bg-slate-50 transition-colors", "disabled:opacity-50 disabled:cursor-not-allowed")}>Use maximum</button>
    </div>
  );
}
