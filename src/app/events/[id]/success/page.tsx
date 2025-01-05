'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Payment } from '@/types';
import Navbar from '@/components/navbar/Navbar';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const paymentId = searchParams.get('paymentId');
  const tokenId = searchParams.get('tokenId'); // Extract tokenId from query params

  useEffect(() => {
    const fetchPayment = async () => {
      if (!paymentId) return;
      try {
        const res = await fetch(`/api/payments?paymentId=${paymentId}`);
        const data = await res.json();
        setPayment(data);
      } catch (error) {
        console.error('Failed to fetch payment:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayment();
  }, [paymentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Successful!</h1>
          </div>

          {payment ? (
            <>
              <div className="space-y-4 mb-6">
                <div className="border-t border-b py-4">
                  <h2 className="text-lg font-semibold mb-4">Payment Details</h2>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment ID:</span>
                      <span className="text-gray-900">{payment.paymentId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Event:</span>
                      <span className="text-gray-900">{payment.eventId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Zone:</span>
                      <span className="text-gray-900">{payment.zone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Quantity:</span>
                      <span className="text-gray-900">{payment.quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="text-gray-900">${payment.totalAmount}</span>
                    </div>
                  </div>
                </div>
              </div>

              {tokenId && (
                <div className="space-y-4 mb-6">
                  <div className="border-t border-b py-4">
                    <h2 className="text-lg font-semibold mb-4">NFT Transfer Details</h2>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">NFT Token ID:</span>
                        <span className="text-gray-900">{tokenId}</span>
                      </div>
                      {/* Optionally, add more NFT transfer details if available */}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={() => router.push('/')}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded transition-colors"
                >
                  Home
                </button>
                <button
                  onClick={() => router.push('/tickets')}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition-colors"
                >
                  My Tickets
                </button>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500">
              Payment details not found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}