"use client";

// Add static export directive

import React from 'react';
import dynamic from 'next/dynamic';

// Static loading component that doesn't use any hooks
const StaticLoading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

// Use dynamic import with ssr: false to ensure all hooks run only on client side
const LoginClientComponent = dynamic(
  () => import('@/components/auth/LoginClient'),
  { 
    ssr: false,
    loading: () => <StaticLoading />
  }
);

// Simple static component with no hooks
export default function LoginPage() {
  return <LoginClientComponent />;
}