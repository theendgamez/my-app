'use client';

import React, { ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import Navbar from '@/components/navbar/Navbar';
import Sidebar from '@/components/admin/Sidebar';
import { useAuth } from '@/context/AuthContext';

interface AdminPageProps {
  children: React.ReactNode;
  title: string;
  isLoading?: boolean;
  error?: string | null;
  backLink?: string;
  actionButton?: ReactNode;
}

export default function AdminPage({
  title,
  children,
  isLoading = false,
  error = null,
  backLink,
  actionButton
}: AdminPageProps) {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Check if page is being rendered on mobile
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  
  // Handle sidebar toggle
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  // Effect to check window size on client side
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      // Close sidebar on mobile automatically
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initialize on mount
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Redirect non-admin users
  React.useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/');
    }
  }, [authLoading, isAdmin, router]);
  
  // If still loading auth state or redirecting
  if (authLoading || (isLoading && !error)) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      
      <div className="flex min-h-screen pt-16"> {/* Add pt-16 to account for navbar height */}
        {/* Sidebar */}
        <Sidebar 
          isOpen={isSidebarOpen} 
          toggleSidebar={toggleSidebar} 
          isMobile={isMobile} 
        />
        
        {/* Main content */}
        <div className={`flex-1 p-4 md:p-6 transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'ml-0'}`}>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              {isMobile && (
                <button 
                  onClick={toggleSidebar}
                  className="mr-4 text-gray-500 hover:text-gray-700"
                  aria-label="Toggle sidebar"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
              
              <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
            </div>
            
            <div className="flex items-center">
              {backLink && (
                <button
                  onClick={() => router.push(backLink)}
                  className="mr-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  返回
                </button>
              )}
              
              {actionButton}
            </div>
          </div>
          
          {error && (
            <Alert type="error" message={error} className="mb-6" />
          )}
          
          {children}
        </div>
      </div>
    </div>
  );
}
