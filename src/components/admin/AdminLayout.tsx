'use client';

import React, { useState, useEffect } from 'react';
import { AdminProvider } from '@/context/AdminContext';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/navbar/Navbar';
import Sidebar from '@/components/admin/Sidebar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { FiMenu } from 'react-icons/fi';

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

  // Ensure component is mounted and refresh auth state
  useEffect(() => {
    setIsMounted(true);
    
    // Check localStorage for admin status as a fallback
    if (typeof window !== 'undefined') {
      const userRole = localStorage.getItem('userRole');
      setLocalAdmin(userRole === 'admin');
      
      // Refresh auth state from the server
      refreshAuthState();
      
      // Set initial sidebar state based on screen size
      setIsSidebarOpen(window.innerWidth >= 768);
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

  // Close sidebar on route change for mobile
  useEffect(() => {
    const handleResize = () => {
      // Only auto-close on mobile
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    // Set initial state
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => window.removeEventListener('resize', handleResize);
  }, [pathname]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

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
    <AdminProvider>
      <Navbar />
      <div className="admin-main-content flex">
        {/* Sidebar */}
        <Sidebar 
          isOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar} 
          isMobile={false}        
        />
        
        {/* Main content area */}
        <div className={`flex-1 flex flex-col transition-all duration-200 
          ${isSidebarOpen ? 'ml-0 md:ml-64' : 'ml-0 md:ml-16'}`}>
          {/* Header with toggle button */}
          <header className="bg-white shadow-sm py-3 px-4 flex items-center sticky top-navbar z-10">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none"
              aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <FiMenu size={24} />
            </button>
            <h1 className="ml-4 text-lg font-medium text-gray-800">
              {title || '票務系統管理'}
            </h1>
          </header>
          
          {/* Content */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </AdminProvider>
  );
}
