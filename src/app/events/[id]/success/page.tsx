'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Payment, Ticket } from '@/types';
import Navbar from '@/components/navbar/Navbar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import { formatCurrency } from '@/utils/formatters'; // Import the new formatter

// Helper function to sanitize redirect URLs to prevent loops
const sanitizeRedirectUrl = (url: string): string => {
  // If the URL already contains 'redirect=', extract just the final target
  if (url.includes('redirect=')) {
    try {
      // Extract the deepest redirect parameter
      const redirectParts = url.split('redirect=');
      if (redirectParts.length > 1) {
        // Get the last part and decode it
        let finalRedirect = redirectParts[redirectParts.length - 1];
        // Remove any trailing parameters
        finalRedirect = finalRedirect.split('&')[0];
        return decodeURIComponent(finalRedirect);
      }
    } catch (e) {
      console.error('Error parsing redirect URL:', e);
    }
  }
  return url;
};

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const { id: eventId } = useParams();
  const router = useRouter();
  
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  
  const [payment, setPayment] = useState<Payment | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchAttempted, setFetchAttempted] = useState(false);
  
  const paymentId = searchParams.get('paymentId');

  useEffect(() => {
    // If authentication is still loading, wait
    if (authLoading) return;

    // Handle not authenticated case
    if (!isAuthenticated) {
      const currentPath = window.location.pathname + window.location.search;
      const cleanRedirectUrl = `/login?redirect=${encodeURIComponent(sanitizeRedirectUrl(currentPath))}`;
      router.push(cleanRedirectUrl);
      return;
    }

    // If we've already tried fetching or there's no paymentId, don't try again
    if (fetchAttempted || !paymentId) {
      if (!paymentId) {
        setError('未提供付款ID');
      }
      setLoading(false);
      return;
    }

    const fetchPaymentDetails = async () => {
      try {
        setFetchAttempted(true);
        
        // Get user ID
        const userId = user?.userId;
        
        // Common request options with authentication
        const requestOptions = {
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId || '' // Add the user ID in header for fallback auth
          }
        };
        
        // Fetch payment details
        const paymentRes = await fetch(`/api/payments/${paymentId}`, requestOptions);
        
        if (!paymentRes.ok) {
          if (paymentRes.status === 401) {
            router.push(`/login?redirect=${encodeURIComponent(sanitizeRedirectUrl(window.location.pathname + window.location.search))}`);
            return;
          }
          
          const errorData = await paymentRes.json().catch(() => ({}));
          throw new Error(errorData.error || `API responded with status: ${paymentRes.status}`);
        }
        
        const paymentData = await paymentRes.json();
        setPayment(paymentData);
        
        // Fetch associated tickets
        const ticketsRes = await fetch(`/api/payments/${paymentId}/tickets`, requestOptions);
        if (ticketsRes.ok) {
          const ticketsData = await ticketsRes.json();
          setTickets(ticketsData);
        } else {
          console.warn(`Failed to fetch tickets: ${ticketsRes.status}`);
        }
      } catch (error) {
        console.error('Failed to fetch payment details:', error);
        setError(error instanceof Error ? error.message : '無法獲取付款詳情');
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentDetails();
  }, [paymentId, isAuthenticated, authLoading, router, eventId, user, fetchAttempted]);


  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours() >= 12 ? '下午' : '上午'}${date.getHours() % 12 || 12}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const isFreePayment = payment && (payment.totalAmount === 0 || payment.totalAmount === null);

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
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg font-semibold">訂單詳情</h2>
                  <button 
                    onClick={() => router.push('/user/order')}
                    className="text-blue-500 hover:text-blue-600 flex items-center text-sm"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    返回票券列表
                  </button>
                </div>
                
                <h3 className="text-xl font-medium mb-2">{payment.eventName}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">訂單編號：</span>
                    <span className="font-medium">{payment.paymentId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">購買時間：</span>
                    <span className="font-medium">{payment.createdAt ? formatShortDate(payment.createdAt) : '—'}</span>
                  </div>
                  
                  {tickets.length > 0 && tickets[0].eventDate && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">活動時間：</span>
                        <span className="font-medium">{formatShortDate(tickets[0].eventDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">活動地點：</span>
                        <span className="font-medium">{tickets[0].eventLocation || '—'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold mb-4">付款詳情</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">付款方式：</span>
                    <span className="font-medium">{isFreePayment ? '免費票券' : '信用卡'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">付款狀態：</span>
                    <span className="text-green-600 font-medium">已完成</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">區域：</span>
                    <span className="font-medium">{payment.zone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">數量：</span>
                    <span className="font-medium">{payment.payQuantity} 張</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-3 border-t">
                    <span>總金額</span>
                    {isFreePayment ? (
                      <span className="text-green-600">免費票券</span>
                    ) : (
                      <span>{formatCurrency(payment.totalAmount)}</span>
                    )}
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
                          <span className="font-medium">{ticket.seatNumber || '—'}</span>
                        </div>
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-600">區域:</span>
                          <span className="font-medium">{ticket.zone || '—'}</span>
                        </div>
                        {ticket.price && (
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-600">票價:</span>
                            <span className="font-medium">
                              {parseInt(ticket.price) === 0 ? '免費' : `HKD ${parseInt(ticket.price).toLocaleString('zh-HK')}`}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-6 flex space-x-4">
                <button
                  onClick={() => router.push('/')}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 px-4 rounded transition-colors"
                >
                  返回首頁
                </button>
                <button
                  onClick={() => router.push('/user/order')}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded transition-colors"
                >
                  我的票券
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