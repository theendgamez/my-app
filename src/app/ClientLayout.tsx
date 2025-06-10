"use client";

import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext'; // Import LanguageProvider
import Footer from '@/components/footer/Footer'; // Import Footer

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider> {/* Add LanguageProvider here */}
      <AuthProvider>
        <div className="flex flex-col min-h-screen">
          {children}
          <Footer /> {/* Add Footer here */}
        </div>
      </AuthProvider>
    </LanguageProvider>
  );
}
