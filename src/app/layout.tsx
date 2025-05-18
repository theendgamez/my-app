import type { Metadata } from "next";
import localFont from "next/font/local";
import { ClientLayout } from "./ClientLayout";
import "./globals.css";
import { AuthProvider } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { ToastContainer } from '@/components/ui/ToastContainer';

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Ticketing System",
  description: "A ticketing system for events",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <NotificationProvider>
            <ClientLayout>
              <div className="min-h-screen pt-16">
                {children}
              </div>
            </ClientLayout>
            <ToastContainer position="bottom-right" />
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
