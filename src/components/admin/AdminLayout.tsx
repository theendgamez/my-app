'use client';

import React, { useState, useEffect } from 'react';
import { AdminProvider } from '@/context/AdminContext';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  // Handle screen resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar on route change for mobile
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [pathname, isMobile]);

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

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Render admin layout with sidebar for authenticated admins
  return (
    <AdminProvider>
      <Navbar />
      <div className="min-h-screen bg-gray-100 flex">
        {/* Mobile sidebar backdrop */}
        {isMobile && isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-gray-900 bg-opacity-50 z-20 transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
        
        {/* Sidebar - adjust positioning based on mobile state */}
        <Sidebar 
          isOpen={isMobile ? isSidebarOpen : true} 
          toggleSidebar={toggleSidebar}
          isMobile={isMobile}
        />
        
        {/* Main content area */}
        <div className={`flex-1 flex flex-col transition-all duration-200 ${isMobile ? 'ml-0' : 'ml-0 md:ml-64'}`}>
          {/* Header for mobile */}
          {isMobile && (
            <header className="bg-white shadow-sm py-4 px-4 flex items-center sticky top-0 z-10">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none"
                aria-label="Open sidebar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="ml-4 text-lg font-semibold text-gray-800">票務系統管理</h1>
            </header>
          )}
          
          {/* Content */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-6">
            {title && <h1 className="text-2xl font-bold mb-6">{title}</h1>}
            {children}
          </main>
        </div>
      </div>
    </AdminProvider>
  );
}
