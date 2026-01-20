"use client";

import React from "react";
import { AlchemyAccountProvider } from "@account-kit/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/ui/tooltip"; // Adjust path if needed (e.g., "@/components/ui/tooltip")
import { config, queryClient } from "@/config"; // Imports your existing config file

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AlchemyAccountProvider config={config} queryClient={queryClient}>
        {/* ThemeProvider enables your Cyberpunk Dark Mode */}
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </ThemeProvider>
      </AlchemyAccountProvider>
    </QueryClientProvider>
  );
}