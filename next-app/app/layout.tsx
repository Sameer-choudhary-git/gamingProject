import type { Metadata } from "next";
import { Inter, Rajdhani } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/ui/toaster";
import { Toaster as Sonner } from "@/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gaming Rollup",
  description: "Web3 Gaming Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // ADD THIS PROP: suppressHydrationWarning
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${rajdhani.variable} antialiased bg-background text-foreground font-sans`}>
        <Providers>
          <main className="min-h-screen">
            {children}
          </main>
          <Toaster />
          <Sonner />
        </Providers>
      </body>
    </html>
  );
}