'use client';

import { ReactNode, useState } from 'react';
import AdminLayout from './AdminLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface AdminPageProps {
  children: React.ReactNode;
  // currentPage: 'dashboard' | 'users' | 'events' | 'tickets' | 'payments' | 'lottery' | 'scalper-detection';
  title: string;
  isLoading?: boolean;
  error?: string | null;
  actionButton?: ReactNode;
}

export default function AdminPage({
  title,
  children,
  isLoading = false,
  error = null,
  actionButton
}: AdminPageProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(error);


  return (
    <AdminLayout title={title}>
      {actionButton && (
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{title}</h1>
          {actionButton}
        </div>
      )}

      {/* Error display */}
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {errorMessage}
          <button 
            onClick={() => setErrorMessage(null)} 
            className="ml-4 text-red-700 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="large" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          {children}
        </div>
      )}
    </AdminLayout>
  );
}
