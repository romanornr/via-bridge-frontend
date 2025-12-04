import { useState, useEffect, useCallback } from 'react';
import { getBitcoinBalance} from "@/services/bitcoin/balance";
import { getViaBalance} from "@/services/via/balance";
import { L1_BTC_DECIMALS} from "@/services/constants";
import { toast } from "sonner";
import type { Token } from "@/services/bridge/tokens";

interface UseBalanceOptions {
  /** The type of network to fetch balance from */
  networkType: "bitcoin" | "evm";
  /** The wallet address to fetch balance for */
  address: string;
  /** The token to fetch for (determines the decimals and fetch method */
  token: Token;
}

interface UseBalanceResult {
  /** Formatted balance string */
  balance: string | null;
  /** Raw balance in the smallest unit (sats for BTC) */
  rawBalance: bigint | null;
  /** Whether the balance is currently being fetched */
  isLoading: boolean;
  /** The token symbol for display */
  symbol: string;
  /** Function to manually refetch the balance */
  refetch: () => void;
}


/**
 * Hook to fetch wallet balance based on network type and token
 * Supports:
 * - Bitcoin (BTC) on Bitcoin network
 * - BTC on the Via Network
 * - Stablecoins (USDC, USDT) on Ethereum/Via network
 *
 * @example
 * ```tsx
 * // Bitcoin balance
 * const { balance, symbol, isLoading } = useBalance({ networkType: "bitcoin", address: "bc1q...", token: { symbol: "BTC", decimals: 8 } });
 *
 * // Stablecoin balance
 * const { balance, symbol } = useBalance({ networkType: "evm", address: "0x...", token: { symbol: "USDC", decimals: 6 } });
 * ```
 */
export function useBalance({ networkType, address, token} : UseBalanceOptions): UseBalanceResult  {
  const [balance, setBalance] = useState<string | null>(null);
  const [rawBalance, setRawBalance] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!address) {
      setBalance(null);
      setRawBalance(null);
      return;
    }

    setIsLoading(true);
    try {
      if (networkType === "bitcoin") {
        const balanceInSats = await getBitcoinBalance(address);
        setRawBalance(BigInt(balanceInSats));
        setBalance((balanceInSats / Math.pow(10, token.decimals)).toFixed(token.decimals));
      } else if (networkType === "evm") {
        // EVM network (could be BTC on VIA or stablecoins
        if (token.symbol === "BTC") {
          // BTC on VIA
          const balanceInBTC = await getViaBalance(address);
          setBalance(balanceInBTC);
          setRawBalance(BigInt(Math.floor(parseFloat(balanceInBTC) * Math.pow(10, L1_BTC_DECIMALS))));
        } else if (token.contractAddress) {
          // TODO implement getERC20Balance
          console.warn("ERC20 balance fetch not yet implemented");
          setBalance(null);
          setRawBalance(null);
        }
      }
    } catch (error) {
      console.error("Error fetching balance", error);
      toast.error("Failed to fetch balance", { description: `Could not fetch  ${token.symbol} `})
      setBalance(null);
      setRawBalance(null);
    } finally {
      setIsLoading(false);
    }
  }, [networkType, address, token]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, rawBalance, isLoading, symbol: token.symbol, refetch: fetchBalance };
}
