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
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff", 
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="antialiased flex flex-col min-h-screen"> {/* Ensure body can flex */}
        <AuthProvider>
          <NotificationProvider>
            <ClientLayout>
              <div className="main-content flex-grow"> {/* Add flex-grow here */}
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
