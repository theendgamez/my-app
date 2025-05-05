'use client';

import { Suspense } from 'react';
import Navbar from '@/components/navbar/Navbar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import TransferTicketContent from './TransferTicketContent';

// Main page component that wraps the content in Suspense
export default function TransferTicketPage() {
  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4 pt-20">
        <Suspense fallback={
          <div className="flex justify-center items-center min-h-[50vh]">
            <LoadingSpinner size="large" />
          </div>
        }>
          <TransferTicketContent />
        </Suspense>
      </div>
    </>
  );
}
