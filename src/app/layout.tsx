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
    <html lang="en" className="dark" data-theme="pro-dark" suppressHydrationWarning>
      <head>
        {/* Apply persisted theme before paint to avoid flash of default theme.
            Defaults to pro-dark; overridden by the Zustand store on hydration. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('deshop-theme');if(t==='pro-dark'||t==='light'||t==='matrix'||t==='phosphor'||t==='amber'){document.documentElement.setAttribute('data-theme',t);}var f=localStorage.getItem('deshop-crt-flicker');if(f==='1'){document.documentElement.classList.add('crt-flicker');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased bg-term-bg text-term-text font-terminal min-h-screen">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
