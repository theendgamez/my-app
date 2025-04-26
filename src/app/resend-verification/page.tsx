'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Static loading component
const StaticLoading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
  </div>
);

// Dynamic import of the client component
const ResendVerificationClient = dynamic(
  () => import('@/components/auth/ResendVerificationClient'),
  {
    ssr: false,
    loading: () => <StaticLoading />
  }
);

export default function ResendVerificationPage() {
  return <ResendVerificationClient />;
}
