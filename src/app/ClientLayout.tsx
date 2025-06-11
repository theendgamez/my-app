"use client";

import { AuthProvider } from '@/context/AuthContext';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
