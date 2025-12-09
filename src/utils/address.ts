// src/utils/address.ts
import { isAddress, getAddress } from "viem";
import { SYSTEM_CONTRACTS_ADDRESSES_RANGE} from "@/services/constants";

/**
 * Mask a wallet address for logging/display.
 * Examples:
 * - maskAddress("0xA1B2C3D4E5F6G7H8I9J0") => "0xA1B2C3...9J0"
 * - maskAddress("bc1qxyz...") => "bc1qxy...xyz"
 */
export function maskAddress(address: string, visibleStart = 6, visibleEnd = 4): string {
  if (!address) return "";
  const len = address.length;
  const minLen = visibleStart + visibleEnd + 3; // +3 for "..."
  if (len <= minLen) return address;
  return `${address.slice(0, visibleStart)}...${address.slice(-visibleEnd)}`;
}

/**
 * Helper to mask an array of addresses.
 */
export function maskAddresses(addresses: string[], visibleStart = 6, visibleEnd = 4): string[] {
  return addresses.map((a) => maskAddress(a, visibleStart, visibleEnd));
}

/**
 * Verify a Bitcoin address (simple bech32 length/prefix check).
 * Supports bc1 (mainnet), tb1 (testnet), and bcr (regtest).
 * NOTE: This mirrors the current zod refine used in forms. Replace with a full bech32 decoded if needed later.
 */
export function verifyBitcoinAddress(address: string): boolean {
  if (!address) return false;
  if (address.startsWith("bc1") || address.startsWith("tb1") || address.startsWith("bcr")) {
    const len = address.length;
    return len >= 42 && len <= 62;
  }
  return false;
}

/**
 * Verify an EVM address (VIA, Ethereum, etc.).
 *
 * Validate that the address is a valid address format
 * Validate that the address is not a system contract address
 *
 * @params address - The address to validate
 * @returns true if valid, false otherwise
 */
export function verifyEvmAddress(address: string): boolean {
  if (!address) return false;

  try {
    // Check if valid EVM address format
    if (!isAddress(address)) return false;

    // Normalize to checksummed address
    const normalizedAddress = getAddress(address)

    // Check if the address is not a system contract address
    // System contracts are below the treshold defined in constants
    const invalidReceiverBn = BigInt(SYSTEM_CONTRACTS_ADDRESSES_RANGE);
    const recipientAddressBn = BigInt(normalizedAddress);

    return recipientAddressBn > invalidReceiverBn;
  } catch {
    return false;
  }
}

/**
 * Verify a recipient address based on the network type
 *
 * @param address - The address to verify
 * @param networkType - The network type to verify against (evm, bitcoin)
 * @returns true if valid, otherwise false
 */
export function verifyRecipientAddress(address: string, networkType: "bitcoin" | "evm"): boolean {
  if (!address) return false;
  return networkType === "bitcoin" ? verifyBitcoinAddress(address) : verifyEvmAddress(address);
}
