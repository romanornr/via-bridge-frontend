"use client";

import React, { useMemo, useId, useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

export type ApprovalTransactionData = {
  fromAmount: string;
  toAmount?: string;
  fromToken: string;
  toToken: string;
  fromNetwork: "Bitcoin" | "VIA";
  toNetwork: "Bitcoin" | "VIA";
  recipientAddress?: string;
  bridgeFee?: string;
  estimatedTime?: string;
  networkFee?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  direction: "deposit" | "withdraw";
  title?: string;
  walletName?: string; // e.g. "MetaMask", "Rabby", "Xverse"
  overlay?: "transparent" | "dim";
  transactionData?: ApprovalTransactionData;
  btcPriceUsd?: number;
};

export default function ApprovalModal({
                                        open,
                                        onOpenChange,
                                        title = "Waiting for confirmation",
                                        walletName = "Wallet",
                                        overlay = "dim",
                                        transactionData,
                                        btcPriceUsd,
                                      }: Props) {
  const titleId = useId();
  const descId = useId();
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // USD approximations if provided
  const fromUsd = useMemo(() => {
    const v = parseFloat(transactionData?.fromAmount || "0");
    return Number.isFinite(v) && btcPriceUsd ? (v * btcPriceUsd).toFixed(2) : undefined;
  }, [transactionData?.fromAmount, btcPriceUsd]);

  const toUsd = useMemo(() => {
    const v = parseFloat(transactionData?.toAmount || "0");
    return Number.isFinite(v) && btcPriceUsd ? (v * btcPriceUsd).toFixed(2) : undefined;
  }, [transactionData?.toAmount, btcPriceUsd]);

  // Overlay: dim (80% opacity) or transparent
  const overlayClass = overlay === "dim" ? "bg-black/80" : "bg-transparent";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={`fixed inset-0 z-40 ${overlayClass}`} />
        <DialogPrimitive.Content className="fixed inset-0 z-50 p-4 flex items-center justify-center outline-none pointer-events-none" aria-labelledby={titleId} aria-describedby={descId}>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-lg relative w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col pointer-events-auto" >
            {/*Header*/}
            <div className="px-6 pt-6 pb-3 border-b border-slate-200 bg-white">
              <h2 id={titleId} className="text-[20px] leading-tight font-bold text-slate-900">
                {title}
              </h2>
              <p id={descId} className="mt-1 text-sm text-slate-600">Approve in {walletName}</p>
            </div>

            {/*Instruction card*/}
            <div className="flex justify-center mb-6">
              <div className="max-w-md w-full text-center bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-[0_6px_18px_rgba(0,0,0,0.09),0_2px_6px_rgba(0,0,0,0.05)]">
                <p className="text-[14px] font-semibold text-slate-900 leading-snug">
                  Please open your {walletName} extension and approve this transaction to continue.
                </p>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="px-6 pt-0 pb-0 flex-1 min-h-0 overflow-y-auto">
              {/* Route */}
              <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold text-slate-900">{transactionData?.fromNetwork}</div>
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                  <div className="text-base font-semibold text-slate-900">{transactionData?.toNetwork}</div>
                </div>
              </div>

                {/*Amount*/}
                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-3 gap-4">
                    {/* From */}
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto rounded-full bg-slate-900 text-white flex items-center justify-center text-lg font-bold mb-2 shadow-sm" aria-hidden>
                        ₿
                      </div>
                      <div className="text-base font-bold text-slate-900">
                        {transactionData?.fromAmount} {transactionData?.fromToken}
                      </div>
                      {fromUsd && (
                        <div className="text-[11px] font-medium text-slate-600">~${fromUsd}</div>
                      )}
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center justify-center">
                      <div className="w-9 h-9 bg-white border border-slate-200 shadow-sm rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                    </div>

                    {/*To*/}
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 text-white flex items-center justify-center text-base font-bold mb-2 shadow-sm" aria-hidden>
                        ₿
                      </div>
                      <div className="text-base font-bold text-slate-900">
                        {(transactionData?.toAmount ?? transactionData?.fromAmount) ?? ""} {transactionData?.toToken}
                      </div>
                      {toUsd && (
                        <div className="text-[11px] font-medium text-slate-600">~${toUsd}</div>
                      )}
                    </div>
                  </div>

                  {/*Summary*/}
                  <div className="border border-slate-200 rounded-md overflow-hidden">
                    <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                      <h3 className="text-sm font-semibold text-slate-900">Transaction Summary</h3>
                    </div>
                    <div className="divide-y divide-slate-200">
                      <div className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-slate-900">Transfer Amount</div>
                          <div className="text-xs text-slate-500 mt-0.5">Total amount being transferred</div>
                        </div>
                        <div className="text-base font-semibold text-slate-900 tabular-nums">
                          {transactionData?.fromAmount} {transactionData?.fromToken}
                        </div>
                    </div>
                      {transactionData?.networkFee && (
                        <div className="px-4 py-3 flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-slate-900">Network Fee</div>
                            <div className="text-xs text-slate-500 mt-0.5">Required for processing</div>
                          </div>
                          <div className="text-base font-semibold text-slate-900 tabular-nums">{transactionData?.networkFee}</div>
                        </div>
                      )}
                      {transactionData?.toAmount && (
                        <div className="px-4 py-3 flex items-center justify-between bg-green-50">
                          <div>
                            <div className="text-sm font-semibold text-green-900">Net Amount Received</div>
                            <div className="text-xs text-green-700 mt-0.5">Amount credited to destination address</div>
                          </div>
                          <div className="text-lg font-bold text-green-900 tabular-nums">
                            {transactionData?.toAmount} {transactionData?.toToken}
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                  {/* Details */}
                  <div className="grid gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-700">Route</span>
                      <span className="inline-flex items-center gap-2 text-xs font-semibold text-green-700 bg-green-50 rounded-full px-3 py-1 border border-green-200 shadow-sm">Optimal</span>
                    </div>
                    {transactionData?.recipientAddress && (
                      <div className="flex justify-between items-center gap-3">
                        <span className="text-sm font-medium text-slate-700">Recipient</span>
                        <span className="text-sm font-semibold text-slate-900 font-mono">{transactionData?.recipientAddress}</span>
                      </div>
                    )}
                    {transactionData?.estimatedTime && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-700">Est. time</span>
                        <span className="text-sm font-semibold text-slate-900">{transactionData?.estimatedTime}</span>
                      </div>
                    )}
                    {transactionData?.bridgeFee && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-700">Bridge Fee</span>
                        <span className="text-sm font-semibold text-slate-900">{transactionData?.bridgeFee}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            {/* Sticky actions */}
            <div className="sticky bottom-0 bg-white pt-4 pb-2 border-t border-slate-200">
              <div className="px-6 flex items-center gap-3">
                <div className="relative w-5 h-5" aria-busy>
                  <svg viewBox="0 0 24 24" className="w-5 h-5" style={{ animation: "spin 1.2s linear infinite" } as React.CSSProperties}>
                    <circle cx="12" cy="12" r="9" stroke="currentColor" className="text-slate-300" strokeWidth="2" fill="none" />
                    <path d="M12 3 a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="text-sm text-slate-900 font-medium flex-1 truncate">Approve in {walletName}</div>
                <button
                  onClick={() => onOpenChange(false)}
                  ref={closeBtnRef}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-semibold shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/*Footer*/}
            <div className="px-6 pb-3">
              <p className="mt-3 text-xs text-slate-500 text-center border-t border-slate-100 pt-3">
                By approving, you authorize a cross-chain bridge transaction. Confirm the official domain, verify recipient address, and review amounts. Transactions cannot be reversed after confirmation.
              </p>
            </div>
          </div>

          {/* Spinner keyframes */}
          <style dangerouslySetInnerHTML={{
            __html: `@keyframes spin { to { transform: rotate(360deg); } }`
          }} />

        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
