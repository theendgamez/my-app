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
  const { isAdmin, isAuthenticated, loading, refreshAuthState } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [localAdmin, setLocalAdmin] = useState(false);

  // Ensure component is mounted and refresh auth state
  useEffect(() => {
    setIsMounted(true);
    
    // Check localStorage for admin status as a fallback
    if (typeof window !== 'undefined') {
      const userRole = localStorage.getItem('userRole');
      setLocalAdmin(userRole === 'admin');
      
      // Refresh auth state from the server
      refreshAuthState();
    }
  }, [refreshAuthState]);

  // Admin access protection with improved logic
  useEffect(() => {
    // Skip if not mounted or still loading auth state or already redirected
    if (!isMounted || hasRedirected) return;
    
    // Use either context admin state or localStorage admin state
    const effectiveIsAdmin = isAdmin || localAdmin;
    
    // Check for authorization
    if (requiresAdmin) {
      // If still loading, wait for auth to complete
      if (loading) return;
      
      // If not authenticated, redirect to login
      if (!isAuthenticated) {
        setHasRedirected(true);
        const redirectPath = `/login?redirect=${encodeURIComponent(pathname || '/admin')}&source=admin`;
        router.push(redirectPath);
        return;
      }
      
      // If authenticated but not admin, redirect to home
      if (isAuthenticated && !effectiveIsAdmin) {
        setHasRedirected(true);
        router.push('/');
        return;
      }
    }
  }, [isMounted, loading, isAuthenticated, isAdmin, localAdmin, router, pathname, requiresAdmin, hasRedirected]);

  // Don't render anything during SSR to avoid hydration issues
  if (!isMounted) return null;

  // Show loading spinner while checking authentication
  if (loading && !localAdmin) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // Use either context admin state or localStorage admin state
  const effectiveIsAdmin = isAdmin || localAdmin;

  // Don't render admin content if user is not an admin (after authentication check)
  if (!loading && requiresAdmin && (!isAuthenticated || !effectiveIsAdmin)) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-4">您沒有訪問此頁面的權限</p>
          <button 
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            返回主頁
          </button>
        </div>
      </div>
    );
  }

  // Render admin layout with sidebar for authenticated admins
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
