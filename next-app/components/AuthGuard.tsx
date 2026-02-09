"use client";

import { useEffect } from "react";
import { useUser, useSignerStatus } from "@account-kit/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const user = useUser();
  const { isInitializing } = useSignerStatus();
  const router = useRouter();

  useEffect(() => {
    // 1. If Alchemy is done loading AND there is no user, kick them out.
    if (!isInitializing && !user) {
      router.push("/");
    }
  }, [user, isInitializing, router]);

  // 2. Show a loading spinner while Alchemy is figuring out login status
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  // 3. If finished loading and no user found, return null (prevent flicker before redirect)
  if (!user) {
    return null;
  }

  // 4. If user is logged in, show the actual page
  return <>{children}</>;
}