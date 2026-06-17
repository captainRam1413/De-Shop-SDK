import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "De-Shop SDK — Terminal Mode",
  description: "Decentralized marketplace SDK built on Algorand. Trade digital assets, manage NFTs, and build custom storefronts with a terminal-based interface.",
  keywords: ["De-Shop", "Algorand", "NFT", "Marketplace", "Web3", "SDK", "Terminal"],
  authors: [{ name: "De-Shop SDK Team" }],
  openGraph: {
    title: "De-Shop SDK — Terminal Mode",
    description: "Decentralized marketplace SDK built on Algorand",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "De-Shop SDK — Terminal Mode",
    description: "Decentralized marketplace SDK built on Algorand",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased bg-term-bg text-term-text font-terminal min-h-screen">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
