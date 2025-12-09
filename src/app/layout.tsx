import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import '@fortawesome/fontawesome-svg-core/styles.css';
import { config } from '@fortawesome/fontawesome-svg-core';
config.autoAddCss = false;
import { Toaster } from "sonner";
import Header from "@/components/header";
import Footer from "@/components/footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VIA Bridge",
  description: "Transfer BTC between Bitcoin and VIA network",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      {/* suppressHydrationWarning on the body is necessary because browser extensions
          (like Grammarly) inject attributes that cause hydration mismatches */}
      <body className={`${inter.className} flex flex-col min-h-screen`} suppressHydrationWarning>
        <Header />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
