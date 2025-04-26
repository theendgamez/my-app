"use client";

import React from 'react';
import Navbar from '@/components/navbar/Navbar';
import Sidebar from "@/components/ui/Sidebar";
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only check authentication when authLoading is complete
    if (!loading) {
      // Redirect if not authenticated or not an admin
      if (!isAuthenticated || !isAdmin) {
        router.push('/login');
      }
    }
  }, [isAuthenticated, isAdmin, loading, router]);

  // Show loading state while authentication is being checked
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Only render the admin layout if authenticated and admin
  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <>
      <Navbar />
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />
        <main className="flex-1 ml-64 p-8">
          {children}
        </main>
      </div>
    </>
  );
}
