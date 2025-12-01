"use client";

import { cn } from "@/lib/utils";
import type { BridgeRoute } from "@/services/bridge/types";

/**
 * Network lane selector
 *
 * Displayers the from -> to network route with a swap button
 *
 * @example
 * ```tsx
 * const route = GetCurrentRoute(mode, BRIDGE_CONFIG.defaultNetwork);
 * <NetworkLaneSelector route={route} onSwap={() => setMode(mode === 'deposit' ? 'withdraw': 'deposit')}/>
 * ```
 */

interface NetworkLaneSelectorProps {
  route: BridgeRoute;
  onSwap: () => void;
  className?: string;
}

/**
 * Network chip component
 *
 * Displays a single network with icon and name
 * Used for both "From" and "To" sides
 */
interface NetworkChipProps {
  label: "From" | "To"
  /** Network display name (e.g. "Bitcoin" or "Via Network Sepolia)" */
  networkName: string;
  icon?: string;
}

function NetworkChip({ label, networkName, icon }: NetworkChipProps) {
  const displayIcon = icon || networkName.charAt(0).toUpperCase();

  return (
    <button type="button" className={cn("group w-full rounded-xl sm:rounded-2xl", "bg-white border-slate-200", "px-3 sm:px-4 py-2 sm:py-3", "text-left shadow-sm hover:shadow transition-shadow")} aria-label={`${label} ${networkName}`}>
      {/*Label: "From" or "To"*/}
      <div className="text-[10px] sm:text-xs uppercase tracking-wide text-slate-500">{label}</div>

      {/*Network icon and name*/}
      <div className="mt-0.5 sm:mt-1 flex items-center gap-2">
        <div className="h-6 w-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 text-xs">{displayIcon}</div>
        <div className="font-semibold text-slate-900">{networkName}</div>
      </div>
    </button>
  );
}

/**
 * Swap button component
 *
 * Circular button with bidirectional arrows
 * Triggers mode swap when clicked
 */
function SwapButton({ onClick }: { onClick: () => void }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "mx-auto rounded-full",
          "border border-slate-300 bg-white",
          "text-slate-700 hover:bg-slate-100",
          "shadow-sm p-2 sm:p-2.5"
        )}
        aria-label="Swap networks"
        title="Swap networks"
        >
        {/*Bidirectional arrows SVG*/}
        <svg
          className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="17 1 21 5 17 9" />
          <line x1="3" y1="5" x2="21" y2="5" />
          <polyline points="7 23 3 19 7 15" />
          <line x1="21" y1="19" x2="3" y2="19" />
        </svg>
      </button>
    );
}

export function NetworkLaneSelector({ route, onSwap, className }: NetworkLaneSelectorProps) {
    const { fromNetwork, toNetwork } = route;

    return (
      <div className={cn("mb-8", className)}>
        <div className="w-full rounded-2xl bg-slate-50 border border-slate-200 p-3 sm:p-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
            {/*From chip*/}
            <NetworkChip label="From" networkName={fromNetwork.displayName} icon={fromNetwork.icon}/>

            <SwapButton onClick={onSwap} />

            {/*To chip*/}
            <NetworkChip label="To" networkName={toNetwork.displayName} icon={toNetwork.icon}/>
          </div>
        </div>
      </div>
    );
  }
