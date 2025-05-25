'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/navbar/Navbar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import RegistrationDetails from '@/components/lottery/RegistrationDetails';
import { Registration } from '@/types';

export default function LotteryRegistrationDetailsPage() {
  const { token } = useParams();
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    // Check authentication first
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (!token) {
      setError('缺少抽籤登記令牌');
      setLoading(false);
      return;
    }

    // Fetch registration details
    const fetchRegistration = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/lottery/registration/${token}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
            'x-user-id': user?.userId || ''
          }
        });

        if (!response.ok) {
          throw new Error('無法獲取登記詳情');
        }

        const data = await response.json();
        setRegistration(data);
      } catch (err) {
        console.error('Error fetching registration:', err);
        setError(err instanceof Error ? err.message : '獲取詳情時出錯');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && token) {
      fetchRegistration();
    }
  }, [token, isAuthenticated, authLoading, router, user]);

  const handlePlatformFeePayment = async () => {
    try {
      setPaymentLoading(true);
      const response = await fetch('/api/payments/lottery/platform-fee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
          'x-user-id': user?.userId || ''
        },
        body: JSON.stringify({
          registrationToken: token,
          paymentType: 'platform_fee'
        })
      });

      if (!response.ok) {
        throw new Error('支付失敗');
      }

      const result = await response.json();
      if (result.success) {
        // Refresh registration data to show updated payment status
        window.location.reload();
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : '支付失敗');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleTicketPayment = async () => {
    try {
      setPaymentLoading(true);
      const response = await fetch('/api/payments/lottery/ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
          'x-user-id': user?.userId || ''
        },
        body: JSON.stringify({
          registrationToken: token,
          paymentType: 'ticket_price'
        })
      });

      if (!response.ok) {
        throw new Error('支付失敗');
      }

      const result = await response.json();
      if (result.success) {
        // Refresh registration data
        window.location.reload();
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : '支付失敗');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <>
        <Navbar />
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner size="large" />
        </div>
      </>
    );
  }

  if (error || !registration) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto p-4 pt-20">
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg max-w-2xl mx-auto">
            <h2 className="text-lg font-semibold mb-2">錯誤</h2>
            <p>{error || '無法獲取抽籤登記詳情'}</p>
            <button 
              onClick={() => router.push('/user/lottery')}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              返回我的抽籤
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4 pt-20">
        <RegistrationDetails registration={registration} />
        
        {/* Payment Section */}
        <div className="max-w-2xl mx-auto mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">付款資訊</h3>
          
          <div className="space-y-4">
            {/* Platform Fee Payment */}
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">平台費用</span>
                <span className="text-lg font-semibold">
                  ${registration?.platformFee || '10.00'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`px-2 py-1 rounded text-sm ${
                  registration?.platformFeePaid 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {registration?.platformFeePaid ? '已付款' : '未付款'}
                </span>
                {!registration?.platformFeePaid && (
                  <button
                    onClick={handlePlatformFeePayment}
                    disabled={paymentLoading}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                  >
                    {paymentLoading ? '處理中...' : '支付平台費'}
                  </button>
                )}
              </div>
            </div>

            {/* Ticket Price Payment (only if won) */}
            {registration?.status === 'won' && (
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">門票價格</span>
                  <span className="text-lg font-semibold">
                    ${registration?.ticketPrice || '50.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`px-2 py-1 rounded text-sm ${
                    registration?.ticketPaid 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {registration?.ticketPaid ? '已付款' : '需要支付'}
                  </span>
                  {!registration?.ticketPaid && (
                    <button
                      onClick={handleTicketPayment}
                      disabled={paymentLoading || !registration?.platformFeePaid}
                      className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
                    >
                      {paymentLoading ? '處理中...' : '支付門票費用'}
                    </button>
                  )}
                </div>
                {!registration?.platformFeePaid && (
                  <p className="text-sm text-gray-600 mt-2">
                    * 請先支付平台費用
                  </p>
                )}
              </div>
            )}

            {/* Payment Instructions */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">付款說明</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 首先需支付平台費用以確認抽籤登記</li>
                <li>• 如果中獎，需要支付門票價格</li>
                <li>• 中獎者無需再次支付平台費用</li>
                <li>• 未中獎者僅需支付平台費用</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}