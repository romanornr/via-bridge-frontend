// src/components/bridge/bridge-mode-tabs.tsx
'use client';

import type { MouseEvent } from 'react';

import { cn } from '@/lib/utils';

export type BridgeMode = 'deposit' | 'withdraw';

interface BridgeModeTabsProps {
  mode: BridgeMode;
  onModeChange: (mode: BridgeMode) => void;
  className?: string;
  withdrawBadgeCount?: number;
  onWithdrawBadgeClick?: () => void;
}

/**
 * Pill-style tabs for switching bridge mode between deposit and withdraw.
 * Optionally shows a withdraw badge button for pending claimable withdrawals.
 */
export function BridgeModeTabs({ mode, onModeChange, className, withdrawBadgeCount, onWithdrawBadgeClick }: BridgeModeTabsProps) {
  const tabBaseClass = 'rounded-xl py-3 text-sm font-medium transition-all';
  const tabActiveClass = 'bg-white text-blue-600 shadow-xs';
  const tabInactiveClass = 'text-slate-600 hover:text-slate-900';
  const badgeBaseClass = 'absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white transition-colors';
  const badgeToneClass = 'bg-red-500 hover:bg-red-600';
  const badgeFocusClass = 'focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:ring-offset-1';

  const showWithdrawBadge = withdrawBadgeCount !== undefined && withdrawBadgeCount > 0;
  const depositTabClass = cn('flex-1', tabBaseClass, mode === 'deposit' ? tabActiveClass : tabInactiveClass);
  const withdrawTabClass = cn('w-full', tabBaseClass, mode === 'withdraw' ? tabActiveClass : tabInactiveClass);

  const handleDepositClick = () => {
    onModeChange('deposit');
  };

  const handleWithdrawClick = () => {
    onModeChange('withdraw');
  };

  const handleWithdrawBadgeClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onWithdrawBadgeClick?.();
  };

  let withdrawBadgeTitle = '';
  if (showWithdrawBadge) {
    withdrawBadgeTitle = `${withdrawBadgeCount} pending withdrawal${withdrawBadgeCount > 1 ? 's' : ''} ready to claim`;
  }

  return (
    <div className={cn('mb-6 flex justify-center', className)}>
      <div className='inline-flex w-full max-w-md gap-1 rounded-2xl bg-slate-100 p-1.5'>
        <button type='button' onClick={handleDepositClick} className={depositTabClass}>Deposit</button>

        <div className='relative flex-1'>
          <button type='button' onClick={handleWithdrawClick} className={withdrawTabClass}>Withdraw</button>

          {showWithdrawBadge && (
            <button type='button' onClick={handleWithdrawBadgeClick} className={cn(badgeBaseClass, badgeToneClass, badgeFocusClass)} title={withdrawBadgeTitle} aria-label={withdrawBadgeTitle}>{withdrawBadgeCount}</button>
          )}
        </div>
      </div>
    </div>
  );
}
