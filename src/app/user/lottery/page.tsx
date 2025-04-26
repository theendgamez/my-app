'use client';

// Prevent static prerendering of this page


import React from 'react';
import dynamic from 'next/dynamic';

// Create a loading component
const StaticLoading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

// Import the actual content component dynamically
const UserLotteryClient = dynamic(() => import('@/components/user/LotteryPage'), {
  ssr: false,
  loading: () => <StaticLoading />
});

// Static shell component
export default function UserLotteryPage() {
  return <UserLotteryClient />;
}
