'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/navbar/Navbar';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import Link from 'next/link';
import { Registration } from '@/types';

export default function LotteryConfirmationPage() {
  const router = useRouter();
  const { id } = useParams();
  const searchParams = useSearchParams();
  // Get registrationToken from either 'registrationToken' or fallback to 'token' parameter
  const registrationToken = searchParams.get('registrationToken') || searchParams.get('token');
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [details, setDetails] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError,] = useState<string | null>(null);

  useEffect(() => {
    // Check authentication first
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (!registrationToken) {
      setError('缺少抽籤登記令牌');
      setLoading(false);
      return;
    }

    // Fetch registration details
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/lottery/registration/${registrationToken}/details`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
            'x-user-id': user?.userId || ''
          }
        });

        if (!response.ok) {
          throw new Error('無法獲取登記詳情');
        }

        const data = await response.json();
        console.log('API Response:', data); // Log the API response for debugging
        
        // Extract registration data, ensuring each field has a default value
        // The API returns nested data with registration, event and zoneDetails
        const registration = data.registration || {};
        const event = data.event || {};
        const zoneDetails = data.zoneDetails || {};
        
        // Create a complete details object with all possible fields and default values
        const detailsWithDefaults: Registration = {
          registrationToken: registration.registrationToken || '',
          eventId: registration.eventId || event.eventId || '',
          eventName: event.eventName || registration.eventName || '未知活動',
          zoneName: registration.zoneName || zoneDetails.name || '未指定區域',
          quantity: registration.quantity || 0,
          drawDate: event.drawDate || '',
          paymentId: registration.paymentId || '',
          paidAt: registration.paidAt || '',
          totalAmount: registration.totalAmount || 0,
          status: registration.status || '待抽籤',
          userId: registration.userId || '',
          platformFee: registration.platformFee || 0,
          createdAt: registration.createdAt || '',
          paymentStatus: registration.paymentStatus || '',
          isDrawn: typeof registration.isDrawn === 'boolean' ? registration.isDrawn : false
        };
        
        setDetails(detailsWithDefaults);
      } catch (err) {
        console.error('Error fetching details:', err);
        setError(err instanceof Error ? err.message : '無法獲取登記詳情');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && registrationToken) {
      fetchDetails();
    }
  }, [id, registrationToken, isAuthenticated, authLoading, router, user]);

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

  if (error && !details) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto p-4 pt-20">
          <Alert type="error" title="錯誤" message={error} />
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => router.push('/user/order')}
              className="px-6 py-2 rounded bg-gray-200 hover:bg-gray-300"
            >
              查看我的票券
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
        <div className="max-w-2xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-green-100 text-green-600 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold mb-2">抽籤登記成功！</h1>
              <p className="text-gray-600">您已成功付款並完成抽籤登記</p>
            </div>

            {details && (
              <div className="border-t border-b border-gray-200 py-4 my-4">
                <h2 className="text-lg font-semibold mb-4">登記詳情</h2>
                <table className="w-full">
                  <tbody className="divide-y text-sm">
                    <tr>
                      <td className="py-2 font-medium">活動名稱</td>
                      <td className="py-2">{details.eventName || '未知活動'}</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium">登記編號</td>
                      <td className="py-2">
                        {details.registrationToken
                          ? `${details.registrationToken.substring(0, 8)}...`
                          : '-'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium">選擇區域</td>
                      <td className="py-2">{details.zoneName ? `${details.zoneName}區` : '未指定區域'}</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium">數量</td>
                      <td className="py-2">{details.quantity ? `${details.quantity} 張` : '未指定數量'}</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium">付款金額</td>
                      <td className="py-2">HKD {(details.totalAmount || 0).toLocaleString('en-HK')}</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium">付款時間</td>
                      <td className="py-2">
                        {details.paidAt && !isNaN(new Date(details.paidAt).getTime()) 
                          ? new Date(details.paidAt).toLocaleString() 
                          : '未知時間'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium">抽籤日期</td>
                      <td className="py-2">
                        {details.drawDate && !isNaN(new Date(details.drawDate).getTime()) 
                          ? new Date(details.drawDate).toLocaleString() 
                          : '未知日期'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold mb-2">下一步</h3>
              <p className="text-sm mb-2">
                1. 系統將在抽籤日期進行隨機抽選。
              </p>
              <p className="text-sm mb-2">
                2. 抽籤結果將通過電子郵件通知您，也可在「我的票券」頁面查看。
              </p>
              <p className="text-sm">
                3. 如您中籤，您已支付的費用將作為票券費用，無需再次付款即可獲得門票。
              </p>
            </div>

            <div className="flex justify-between gap-4">
              <Link 
                href="/user/order" 
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-center"
              >
                查看我的票券
              </Link>
              <Link 
                href="/" 
                className="flex-1 px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded text-center"
              >
                返回首頁
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
