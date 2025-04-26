'use client';


import React from 'react';
import dynamic from 'next/dynamic';

// Static loading component
const StaticLoading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

// Dynamic import for client-only rendering
const DynamicEventPage = dynamic(() => import('@/components/events/EventDetail'), {
  ssr: false,
  loading: () => <StaticLoading />
});

export default function EventPage() {
  return <DynamicEventPage />;
}