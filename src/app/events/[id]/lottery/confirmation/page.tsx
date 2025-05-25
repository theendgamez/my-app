'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/navbar/Navbar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import { Registration } from '@/types';

export default function LotteryConfirmationPage() {
  const router = useRouter();
  const { id } = useParams();
  const searchParams = useSearchParams();
  const registrationToken = searchParams.get('registrationToken');
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check authentication first
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    if (!registrationToken || registrationToken === 'null') {
      setError('缺少抽籤登記令牌');
      setLoading(false);
      return;
    }

    const fetchDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/lottery/registration/${registrationToken}`, {
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
        console.error('Error fetching registration details:', err);
        setError(err instanceof Error ? err.message : '獲取詳情時出錯');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && registrationToken && registrationToken !== 'null') {
      fetchDetails();
    }
  }, [registrationToken, isAuthenticated, authLoading, router, user]);

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

  if (error) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto p-4 pt-20">
          <Alert type="error" title="錯誤" message={error} />
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => router.push(`/events/${id}`)}
              className="px-6 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white"
            >
              返回活動頁面
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
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-green-800 mb-2">付款成功！</h1>
            <p className="text-gray-600 mb-6">您的抽籤登記已確認</p>
            
            {registration && (
              <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
                <h3 className="font-semibold mb-3">登記詳情</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">活動：</span>{registration.eventName}</p>
                  <p><span className="font-medium">登記號碼：</span>{registration.registrationToken.substring(0, 8)}...</p>
                  <p><span className="font-medium">選擇區域：</span>{registration.zoneName}區</p>
                  <p><span className="font-medium">數量：</span>{registration.quantity} 張</p>
                  <p><span className="font-medium">狀態：</span>
                    <span className="ml-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {registration.status === 'won' ? '已中籤' : 
                       registration.status === 'lost' ? '未中籤' : '等待抽籤'}
                    </span>
                  </p>
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                您將收到確認電子郵件。抽籤結果將在抽籤日期後通知您。
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => router.push('/user/lottery')}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
                >
                  查看我的抽籤
                </button>
                <button
                  onClick={() => router.push(`/events/${id}`)}
                  className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded"
                >
                  返回活動頁面
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
