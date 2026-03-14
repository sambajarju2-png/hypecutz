"use client";

import { AuthProvider } from "@/components/AuthProvider";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <PwaInstallPrompt />
    </AuthProvider>
  );
}
