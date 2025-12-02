// src/components/bridge/bridge-mode-tabs.tsx
"use client";

import { cn } from "@/lib/utils";

/**
 *  Bridge Mode Tabs
 *  A pill-style switch for toggling between deposit and withdrawal modes
 *
 *  @example
 *  ```tsx
 *  <BridgeModeTabs mode={mode} onModeChange={setmode} />
 *  ```
 */

export type BridgeMode = "deposit" | "withdraw";

interface BridgeModeTabsProps {
  mode: BridgeMode;
  onModeChange: (mode: BridgeMode) => void;
  className?: string;
}

export function BridgeModeTabs({ mode, onModeChange, className }: BridgeModeTabsProps) {
  return (
    <div className={cn("flex justify-center mb-6", className)}>
      <div className="bg-slate-100 rounded-2xl p-1.5 inline-flex gap-1 w-full max-w-md">
        <button type="button" onClick={() => onModeChange("deposit")}
                className={cn("flex-1 py-3 text-sm font-medium rounded-xl transition-all", mode === "deposit" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900")}>Deposit</button>
        <button type="button" onClick={() => onModeChange("withdraw")} className={cn("flex-1 py-3 text-sm font-medium rounded-xl transition-all", mode === "withdraw" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900")}>Withdraw</button>
      </div>
    </div>
  );
}
