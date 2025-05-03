'use client';

import { useEffect } from 'react';
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

  // Admin access protection
  useEffect(() => {
    // Skip if still loading auth state
    if (loading) return;
    
    // Check for authorization
    if (requiresAdmin) {
      // If not authenticated, redirect to login
      if (!isAuthenticated) {
        const redirectPath = `/login?redirect=${encodeURIComponent(pathname || '/admin')}`;
        router.push(redirectPath);
        return;
      }
      
      // If authenticated but not admin, redirect to home
      if (isAuthenticated && !isAdmin) {
        router.push('/');
        return;
      }
    }
  }, [loading, isAuthenticated, isAdmin, router, pathname, requiresAdmin]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // Don't render anything if not authorized (prevents flash of content)
  if (requiresAdmin && (!isAuthenticated || !isAdmin)) {
    return null;
  }

  // Render admin layout with sidebar
  return (
    <div>
      <Navbar />
      <div className="flex">
        <Sidebar />
        <div className="container mx-auto p-8 ml-64 pt-16">
          {title && <h1 className="text-2xl font-bold mb-6">{title}</h1>}
          {children}
        </div>
      </div>
    </div>
  );
}
