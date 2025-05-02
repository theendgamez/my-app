'use client';

import { useState, useEffect, ComponentType } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function withAdminProtection<P extends object>(
  Component: ComponentType<P>
): ComponentType<P> {
  return function ProtectedComponent(props: P) {
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated, isAdmin, loading } = useAuth();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
      // Skip if still loading auth state
      if (loading) return;

      // If authentication check is complete
      if (!isAuthenticated) {
        router.push(`/login?redirect=${encodeURIComponent(pathname || '')}`);
        return;
      }

      if (!isAdmin) {
        router.push('/');
        return;
      }

      // User is authenticated and is an admin
      setAuthorized(true);
    }, [isAuthenticated, isAdmin, loading, pathname, router]);

    // Show loading spinner while checking authentication
    if (loading || !authorized) {
      return (
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner size="large" />
        </div>
      );
    }

    // Render component if user is authorized
    return <Component {...props} />;
  };
}
