"use client";

// Add static export directive

import React from 'react';
import dynamic from 'next/dynamic';

// Static loading component
const StaticLoading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

// Dynamic import with explicit ssr: false
const SignupClientComponent = dynamic(
  () => import('@/components/auth/SignupClient'),
  { 
    ssr: false,
    loading: () => <StaticLoading />
  }
);

// Static shell component
export default function SignupPage() {
  return <SignupClientComponent />;
}
