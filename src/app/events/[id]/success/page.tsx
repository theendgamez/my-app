'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Payment, Ticket } from '@/types';
import Navbar from '@/components/navbar/Navbar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const { id: eventId } = useParams();
  const router = useRouter();
  
  // Use optional chaining with useAuth to prevent errors during initial render
  const auth = typeof window !== 'undefined' ? useAuth() : null;
  const isAuthenticated = auth?.isAuthenticated || false;
  const authLoading = auth?.loading || true;
  
  const [payment, setPayment] = useState<Payment | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const paymentId = searchParams.get('paymentId');

  useEffect(() => {
    // Only run the authentication check if auth context is available
    if (auth && !authLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(`/events/${eventId}`)}`);
      return;
    }

    const fetchPaymentDetails = async () => {
      if (!paymentId) {
        setError('未提供付款ID');
        setLoading(false);
        return;
      }
      
      if (!isAuthenticated) {
        // Wait for authentication to complete
        return;
      }
      
      try {
        // Fetch payment details using the new endpoint
        const paymentRes = await fetch(`/api/payments/${paymentId}`);
        if (!paymentRes.ok) {
          const errorData = await paymentRes.json().catch(() => ({}));
          throw new Error(errorData.error || `API responded with status: ${paymentRes.status}`);
        }
        
        const paymentData = await paymentRes.json();
        setPayment(paymentData);
        
        // Fetch associated tickets using the new endpoint
        const ticketsRes = await fetch(`/api/tickets/payment/${paymentId}`);
        if (!ticketsRes.ok) {
          console.warn(`Failed to fetch tickets: ${ticketsRes.status}`);
        } else {
          const ticketsData = await ticketsRes.json();
          setTickets(ticketsData);
        }
      } catch (error) {
        console.error('Failed to fetch payment details:', error);
        setError(error instanceof Error ? error.message : '無法獲取付款詳情');
      } finally {
        setLoading(false);
      }
    };

    if (auth && isAuthenticated && paymentId) {
      fetchPaymentDetails();
    } else if (auth && !authLoading && !paymentId) {
      setLoading(false);
      setError('無效的付款資訊');
    }
  }, [paymentId, isAuthenticated, authLoading, router, eventId, auth]);

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('zh-HK', options);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="flex justify-center items-center h-screen">
          <LoadingSpinner size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-20">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white text-center">
            {error ? (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold">付款驗證失敗</h1>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold">付款成功！</h1>
                <p className="opacity-80 mt-2">您的票券已準備就緒</p>
              </>
            )}
          </div>

          {error ? (
            <div className="p-6">
              <Alert type="error" message={error} />
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => router.push(`/events/${eventId}`)}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
                >
                  返回活動頁面
                </button>
              </div>
            </div>
          ) : payment ? (
            <>
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold mb-4">付款詳情</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">付款編號:</span>
                    <span className="font-medium">{payment.paymentId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">活動:</span>
                    <span className="font-medium">{payment.eventName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">區域:</span>
                    <span className="font-medium">{payment.zone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">數量:</span>
                    <span className="font-medium">{payment.payQuantity} 張</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">付款日期:</span>
                    <span className="font-medium">{formatDate(payment.createdAt)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>總金額:</span>
                    <span>HKD {payment.totalAmount.toLocaleString('en-HK')}</span>
                  </div>
                </div>
              </div>

              {tickets.length > 0 && (
                <div className="p-6 border-b">
                  <h2 className="text-lg font-semibold mb-4">票券詳情</h2>
                  <div className="space-y-4">
                    {tickets.map(ticket => (
                      <div key={ticket.ticketId} className="p-3 border rounded-lg bg-gray-50">
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-600">票券號碼:</span>
                          <span className="font-medium">{ticket.ticketId.substring(0, 8)}</span>
                        </div>
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-600">座位:</span>
                          <span className="font-medium">{ticket.seatNumber}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-6 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={() => router.push('/')}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded transition-colors"
                >
                  返回首頁
                </button>
                <button
                  onClick={() => router.push('/tickets')}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition-colors"
                >
                  查看我的票券
                </button>
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-gray-500">
              找不到付款詳情
            </div>
          )}
        </div>
      </div>
    </div>
  );
}