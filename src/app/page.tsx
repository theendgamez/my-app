"use client";
import dynamic from 'next/dynamic';
import React from 'react';

// Static loading component
const StaticLoading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

// Dynamic import with explicit ssr: false
const HomePageClient = dynamic(
  () => import('@/components/HomePage'),
  { 
    ssr: false,
    loading: () => <StaticLoading />
  }
);

// Static shell component with no hooks
export default function Home() {
  return <HomePageClient />;
}