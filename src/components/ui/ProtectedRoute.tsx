'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
}

export default function ProtectedRoute({ 
  children, 
  requiredRole 
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    // If the authentication is still loading, wait
    if (loading) return;

    // If user is not authenticated, redirect to login
    if (!isAuthenticated) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    // If there's a required role, check if user has it (or is an admin)
    if (requiredRole) {
      if (user?.role === requiredRole || user?.role === 'admin') {
        setHasPermission(true);
      } else {
        // Redirect to home if user doesn't have required role
        router.push('/');
      }
    } else {
      // No role required, user is authenticated
      setHasPermission(true);
    }
  }, [loading, isAuthenticated, user, requiredRole, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // Only render children if user has permission
  return hasPermission ? <>{children}</> : null;
}