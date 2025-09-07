'use client';

import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";
import { useDownloadLimitStore } from "@/shared/model/useDownloadLimitStore";

export function Providers({ children }: { children: React.ReactNode }) {

  useEffect(()=>{
    useDownloadLimitStore.getState().resetIfNeeded();
  }, [])
  return <SessionProvider>{children}</SessionProvider>;
}
