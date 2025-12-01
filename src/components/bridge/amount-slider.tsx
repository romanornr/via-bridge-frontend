// src/components/bridge/amount-slider.tsx
"use client";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface AmountSliderProps {
  /** Current amount value */
  value: number;
  /** Maximum amount (balance minus fee reserve) */
  max: number;
  /** callback when amount changes */
  onChange: (value: number) => void;
  /** Unit to display (e.g., "BTC", "VIA", "USDC") */
  unit: string;
  /** Number of decimal places */
  decimals?: number;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Amount Slider
 *
 * A slider for selecting transfer amounts as percentage of available balance.
 *
 * @example
 * ```tsx
 * <AmountSlider value={0.005} max={0.01} onChange={setAmount} unit="BTC"/>
 * ```
 */
export function AmountSlider({ value, max, onChange, unit, decimals = 8, className}: AmountSliderProps) { // TODO  check if decimals should really be 8 or does it depend on the token?
  const safeMax = Math.max(max, 1e-12); // Prevent division by zero
  const percentage = useMemo(() => Math.min(100, Math.max(0, value / safeMax * 100)), [value, safeMax]); // only recalculate when value or safeMax changes

  return (
    <div className={cn("border border-slate-200 rounded-md bg-slate-50 p-5", className)}>
      {/*Custom CSS for slider styling*/}
      <style>{`
        :root {
          --brand-green: #10b981;
        }
        input[type="range"].amount-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 999px;
          outline: none;
          background: transparent;
        }
        input[type="range"].amount-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          background: white;
          border: 3px solid var(--brand-green);
          border-radius: 50%;
          cursor: grab;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        }
        input[type="range"].amount-slider::-webkit-slider-thumb:hover {
          transform: scale(1.08);
        }
        input[type="range"].amount-slider::-webkit-slider-thumb:active {
          cursor: grabbing;
          transform: scale(1.02);
        }
        input[type="range"].amount-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: white;
          border: 3px solid var(--brand-green);
          border-radius: 50%;
          cursor: grab;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        }
      `}</style>

      <div className="space-y-4">
        {/*Header: percentage and amount */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Using {percentage.toFixed(1)}% of available balance</span>
          <span className="font-medium text-slate-900 tabular-nums">{value.toFixed(decimals)} /  {max.toFixed(decimals)} {unit}</span>
        </div>
      </div>

      {/*Slider track with markers*/}
      <div className="relative py-3">
        {/*Tick marks*/}
        <div className="absolute left-2.5 right-2.5 top-1 flex-justify-between">{[0, 25, 50, 75, 100].map((tick) => (
          <div key={tick} className="w-px h-2 bg-slate-300"/>
        ))}
        </div>

        {/*Slider container*/}
        <div className="relative px-2.5 mt-5 mb-1">
          <div className="relative h-5 flex items-center">
            {/*Background track*/}
            <div className="absolute left-0 right-0 h-1.5 rounded-full bg-slate-200">
              {/*Filled Track - width: calc((100% - 20px) * percentage) - Subtracts thumb width (20px) from total width*/}
              <div className="absolute left-0 h-1.5 rounded-full pointer-events-none" style={{width: `calc((100% - 20px) * ${percentage / 100})`, backgroundColor: "var(--brand-green)",}}/>

              {/*Range input*/}
              <input type="range" min="0" max={max} step={Math.pow(10, -decimals)} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="amount-slider absolute inset-0 w-full" style={{ margin: 0 }}/>
            </div>
          </div>
          {/*Percentage labels*/}
          <div className="flex justify-between text-[10px] font-medium text-slate-500 uppercase tracking-wider px-2.5">
            <span>0</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
