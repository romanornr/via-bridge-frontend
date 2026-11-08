import { z } from "zod";
import { BitcoinNetwork } from "@/services/bitcoin/types";

const schema = z.object({
    NEXT_PUBLIC_NETWORK: z.enum(BitcoinNetwork),
    NEXT_PUBLIC_ENABLE_FAUCET: z.preprocess(
        (val) => val === "true" || val === true,
        z.boolean(),
    ),
    NEXT_PUBLIC_API_URL: z.string().url(),
    NEXT_PUBLIC_WALLETCONNECT_ID: z.string().min(1, "Missing WalletConnect Project ID"),
});

export const env = () => {
    const parsed = schema.safeParse({
        NEXT_PUBLIC_NETWORK: process.env.NEXT_PUBLIC_NETWORK,
        NEXT_PUBLIC_ENABLE_FAUCET: process.env.NEXT_PUBLIC_ENABLE_FAUCET,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        NEXT_PUBLIC_WALLETCONNECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_ID,
    });

    if (!parsed.success) {
        throw new Error("Invalid client env: " + z.prettifyError(parsed.error));
    }

    return parsed.data;
};
