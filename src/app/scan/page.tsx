'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Client component that uses useSearchParams
function ScanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Get encoded data from URL
    const encodedData = searchParams.get('data');
    
    if (!encodedData) {
      // If no data, redirect to main scanner page
      router.push('/admin/tickets/scan');
      return;
    }
    
    try {
      // Decode the data
      const decodedString = Buffer.from(encodedData, 'base64').toString();
      const decodedData = JSON.parse(decodedString);
      
      // If we have a ticket ID, redirect to the ticket verification page
      if (decodedData && decodedData.ticketId) {
        router.push(`/admin/tickets/verify/${decodedData.ticketId}?source=ios-camera&data=${encodedData}`);
      } else {
        // Invalid data format, go to scanner
        router.push('/admin/tickets/scan');
      }
    } catch (err) {
      console.error("Failed to decode QR data:", err);
      // Go to scanner with error parameter
      router.push('/admin/tickets/scan?error=invalid-qr');
    }
  }, [router, searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <LoadingSpinner size="large" />
      <p className="mt-4 text-gray-600">處理中，請稍候...</p>
    </div>
  );
}

// Main page component that wraps ScanContent in Suspense
export default function ScanHandler() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <LoadingSpinner size="large" />
        <p className="mt-4 text-gray-600">載入中...</p>
      </div>
    }>
      <ScanContent />
    </Suspense>
  );
}
