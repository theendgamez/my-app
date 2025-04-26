"use client";

import React from 'react';
import dynamic from 'next/dynamic';

// Static loading component
const StaticLoading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
  </div>
);

// Dynamic import with explicit ssr: false
const VerifyEmailClientComponent = dynamic(
  () => import('@/components/auth/VerifyEmailClient'),
  { 
    ssr: false,
    loading: () => <StaticLoading />
  }
);

// Static shell component
export default function VerifyEmailPage() {
  return <VerifyEmailClientComponent />;
}