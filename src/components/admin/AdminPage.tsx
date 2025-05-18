'use client';

import React, { ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import AdminLayout from './AdminLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Alert } from '../ui/Alert';

interface AdminPageProps {
  children: React.ReactNode;
  title: string;
  isLoading?: boolean;
  error?: string | null;
  actionButton?: ReactNode;
  backLink?: string;
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
  const { isAuthenticated, isAdmin } = useAuth();
  const [errorMessage] = useState<string | null>(error);

  // If not authenticated or not admin, redirect
  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // If not admin, redirect
  if (isAuthenticated && !isAdmin) {
    router.push('/');
    return null;
  }

  return (
    <AdminLayout title={title}>
      {/* Page header with back button and actions */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center">
          {backLink && (
            <Link
              href={backLink}
              className="mr-3 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-full inline-flex items-center justify-center transition-colors"
              aria-label="Go back"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          )}
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h1>
        </div>

        {/* Action button (optional) */}
        {actionButton && (
          <div className="flex justify-start sm:justify-end">
            {actionButton}
          </div>
        )}
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="mb-6">
          <Alert type="error" message={errorMessage} />
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      ) : (
        // Render children when not loading
        <div className="bg-white rounded-lg shadow-md p-6">
          {children}
        </div>
      )}
    </AdminLayout>
  );
}
