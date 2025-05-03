'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/navbar/Navbar';
import Sidebar from '@/components/admin/Sidebar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  requiresAdmin?: boolean;
}

export default function AdminLayout({ 
  children, 
  title = '管理面板', 
  requiresAdmin = true 
}: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAdmin, isAuthenticated, loading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component is mounted (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Admin access protection
  useEffect(() => {
    // Skip if not mounted or still loading auth state
    if (!isMounted || loading) return;
    
    // Check for authorization
    if (requiresAdmin) {
      // If not authenticated, redirect to login
      if (!isAuthenticated) {
        const redirectPath = `/login?redirect=${encodeURIComponent(pathname || '/admin')}&source=admin`;
        router.push(redirectPath);
        return;
      }
      
      // If authenticated but not admin, redirect to home
      if (isAuthenticated && !isAdmin) {
        router.push('/');
        return;
      }
    }
  }, [isMounted, loading, isAuthenticated, isAdmin, router, pathname, requiresAdmin]);

  // Don't render anything during SSR to avoid hydration issues
  if (!isMounted) return null;

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // Render admin layout with sidebar
  return (
    <div>
      <Navbar />
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="container mx-auto p-8 ml-64 pt-16">
          {title && <h1 className="text-2xl font-bold mb-6">{title}</h1>}
          {children}
        </div>
      </div>
    </div>
  );
}
