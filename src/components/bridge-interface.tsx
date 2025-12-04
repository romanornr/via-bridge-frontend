// src/components/bridge-interface.tsx
"use client";

import {BridgeForm} from "@/components/bridge";

/**
 * Bridge Interface
 * Main entry point for the bridge page
 */
export default function BridgeInterface() {
  return (
    <div className="flex flex-col items-center pb-6">
      <BridgeForm/>
    </div>
  );
}
