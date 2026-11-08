// src/components/ethereum-bridge/sections/claim-section.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { toast } from "sonner";
import { Loader2, ExternalLink, CheckCircle2, Clock, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEthereumClaim } from "@/hooks/use-ethereum-claim";
import {
  useEthereumClaimableWithdrawals,
  type ClaimableWithdrawalDisplay,
} from "@/hooks/use-ethereum-claimable-withdrawals";
import { useWalletState } from "@/hooks/use-wallet-state";
import { useWalletStore } from "@/store/wallet-store";
import { GetCurrentRoute } from "@/services/bridge/routes";

interface ClaimSectionProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onReadyCountChange: (count: number) => void;
}

export function ClaimSection({ isOpen, onOpenChange, onReadyCountChange }: ClaimSectionProps) {
  const [isAutoSwitching, setIsAutoSwitching] = useState(false);

  const { claim, isClaiming, ensureOnEthereumNetwork } = useEthereumClaim();
  const { readyWithdrawals, pendingWithdrawals, readyCount, isChecking } = useEthereumClaimableWithdrawals();
  const { isCorrectL1Network, isL1Connected, isMetamaskConnected, l1Address, viaAddress } = useWalletState();
  const { fetchEthTransactions, checkL1Network } = useWalletStore();

  const ethereumChainName = useMemo(() => {
    const route = GetCurrentRoute("withdraw", "ethereum");
    return route.toNetwork.displayName;
  }, []);

  // Sync ready count up to parent for badge display
  useEffect(() => {
    onReadyCountChange(readyCount);
  }, [readyCount, onReadyCountChange]);

  const canClaim = isCorrectL1Network && (isL1Connected || (isMetamaskConnected && !!(l1Address || viaAddress)));

  const handleClaim = async (withdrawal: ClaimableWithdrawalDisplay) => {
    try {
      toast.info("Claiming withdrawal...", { description: "Please approve in your wallet." });
      const result = await claim(withdrawal);
      toast.success("Withdrawal claimed", { description: result.txHash });
      fetchEthTransactions();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Claim failed";
      if (message.includes("rejected") || message.includes("ACTION_REJECTED")) {
        toast.error("Transaction Rejected", {
          description: "You rejected the transaction in your wallet.",
        });
      } else {
        toast.error("Claim failed", { description: message });
      }
    }
  };

  const handleSwitchNetwork = async () => {
    if (isAutoSwitching) return;

    setIsAutoSwitching(true);
    try {
      await ensureOnEthereumNetwork();

      // Best-effort refresh. The chainChanged listener in use-wallet-state also calls checkL1Network.
      try {
        await checkL1Network();
      } catch {
        // Non-critical: listener will catch up
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? (err as { code: number }).code
          : undefined;

      // User rejected - not an error
      if (code === 4001 || message.includes("ACTION_REJECTED") || message.includes("rejected")) {
        return;
      }

      // Wallet already has a pending request
      if (code === -32002) {
        toast.info("Check your wallet", { description: "A network switch request is already pending." });
        return;
      }

      console.error(`Failed to switch to ${ethereumChainName}:`, err);
      toast.error("Failed to switch network", { description: message });
    } finally {
      setIsAutoSwitching(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Withdrawals
            </span>
            <Badge variant="secondary">{readyCount}</Badge>
          </DialogTitle>
        </DialogHeader>

        {isAutoSwitching && (
          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Loader2 className="h-5 w-5 text-blue-600 shrink-0 animate-spin" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">Switching to {ethereumChainName}...</p>
              <p className="text-xs text-blue-700 mt-1">Please approve the network switch in your wallet.</p>
            </div>
          </div>
        )}

        {!canClaim && !isAutoSwitching && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">Connect to {ethereumChainName}</p>
              <p className="text-xs text-amber-700 mt-1">
                You need to be connected to {ethereumChainName} to claim withdrawals.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleSwitchNetwork} disabled={isAutoSwitching}>
              Switch to {ethereumChainName}
            </Button>
          </div>
        )}

        {isChecking && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
            <p className="text-sm text-muted-foreground">Checking withdrawal readiness...</p>
          </div>
        )}

        {readyWithdrawals.length === 0 && !isChecking ? (
          <EmptyState pendingCount={pendingWithdrawals.length} />
        ) : (
          <div className="space-y-3 mt-4">
            {readyWithdrawals.map((withdrawal) => (
              <WithdrawalRow
                key={withdrawal.nonce}
                withdrawal={withdrawal}
                claiming={isClaiming(withdrawal.nonce)}
                canClaim={canClaim}
                onClaim={handleClaim}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({ pendingCount }: { pendingCount: number }) {
  return (
    <div className="text-center py-8 space-y-4">
      <div className="text-muted-foreground">
        <p>No withdrawals ready to claim.</p>
        {pendingCount > 0 && (
          <p className="text-xs mt-2">
            {pendingCount} withdrawal{pendingCount > 1 ? "s" : ""} pending verification...
          </p>
        )}
      </div>
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left max-w-md mx-auto">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-blue-900">Withdrawal Processing</p>
            <p className="text-xs text-blue-700 leading-relaxed">
              After you submit a withdrawal, you can withdraw again immediately. When your withdrawal
              is ready to claim, it will appear here automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function WithdrawalRow({
  withdrawal,
  claiming,
  canClaim,
  onClaim,
}: {
  withdrawal: ClaimableWithdrawalDisplay;
  claiming: boolean;
  canClaim: boolean;
  onClaim: (w: ClaimableWithdrawalDisplay) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-base">
            {parseFloat(ethers.formatUnits(withdrawal.shares, withdrawal.decimals)).toLocaleString(undefined, {
              maximumFractionDigits: withdrawal.decimals,
            })}{" "}
            {withdrawal.symbol}
          </span>
          <Badge variant="outline" className="text-xs">Ready to Claim</Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <a
            href={withdrawal.viaExplorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-primary transition-colors"
          >
            View L2 Transaction <ExternalLink className="h-3 w-3" />
          </a>
          <span>-</span>
          <span>{new Date(withdrawal.timestamp).toLocaleDateString()}</span>
        </div>
      </div>
      <Button onClick={() => onClaim(withdrawal)} disabled={claiming || !canClaim} size="sm" className="ml-4">
        {claiming ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Claiming...</>
        ) : (
          <><CheckCircle2 className="mr-2 h-4 w-4" />Claim</>
        )}
      </Button>
    </div>
  );
}