// src/components/bridge/recipient-address-section.tsx
"use client";

import { cn } from "@/lib/utils";
import AddressFieldWithWallet from "@/components/address-field-with-wallet";
import {BridgeRoute} from "@/services/bridge/types";

interface RecipientAddressSectionProps {
  /** Bridge route configuration from GetCurrentRoute() */
  route: BridgeRoute;
  /** Current address value */
  value: string;
  /** Callback when address value changes */
  onChange:(value: string) => void;
  /** Additional CSS classes*/
  className?: string;
}

/** Recipient address section
 *  Wrapper around AddressFieldWithWallet that derives its configuration from the bridge route data
 *
 *  @example
 *  ```tsx
 *  <RecipientAddressSection route={route} value={address} onChange={setRecipientAddress} />
 *  ```
 * */
export function RecipientAddressSection({route, value, onChange, className}: RecipientAddressSectionProps) {
  // Derive from a route's destination network
  const { toNetwork } = route;

  // Address mode comes from network type (e.g., "evm", "bitcon", etc.)
  const addressMode = toNetwork.type === "evm" ? "via" : "bitcoin";

  // Use network's display name for the label
  // e.g., "Recipient Via Network Sepolia Address"
  // e.g., "Recipient Bitcoin Testnet4 Address"
  const label = `Recipient ${toNetwork.displayName} Address`;

  // Placeholder based on a network type
  const placeholder = toNetwork.type === "evm" ? "0x..." : "bc1...";

  return (
    <div className={cn("mb-8", className)}>
      <AddressFieldWithWallet mode={addressMode} label={label} placeholder={placeholder} value={value} onChange={onChange}/>
    </div>
  );
}
