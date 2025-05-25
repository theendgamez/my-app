'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/navbar/Navbar';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import Link from 'next/link';
import { Registration } from '@/types';

export default function LotteryDetailsPage() {
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

    if (!registrationToken) {
      setError('缺少抽籤登記令牌');
      setLoading(false);
      return;
    }

    // Fetch lottery registration details
    const fetchRegistration = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/lottery/registration/${registrationToken}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
            'x-user-id': user?.userId || ''
          }
        });

        if (!response.ok) {
          throw new Error('無法獲取抽籤登記詳情');
        }

        const data = await response.json();
        setRegistration(data);
      } catch (err) {
        console.error('Error fetching registration:', err);
        setError(err instanceof Error ? err.message : '無法獲取抽籤登記詳情');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && registrationToken) {
      fetchRegistration();
    }
  }, [id, registrationToken, isAuthenticated, authLoading, router, user]);

  // Helper function to format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '未指定';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return '日期格式有誤';
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

  if (error && !registration) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto p-4 pt-20">
          <Alert type="error" title="錯誤" message={error} />
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => router.push('/user/lottery')}
              className="px-6 py-2 rounded bg-gray-200 hover:bg-gray-300"
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
        <div className="max-w-2xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">抽籤登記詳情</h1>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                registration?.status === 'won' ? 'bg-green-100 text-green-800' :
                registration?.status === 'lost' ? 'bg-gray-100 text-gray-800' :
                registration?.status === 'drawn' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {registration?.status === 'won' && '已中籤'}
                {registration?.status === 'lost' && '未中籤'}
                {registration?.status === 'drawn' && '已抽籤'}
                {registration?.status === 'registered' && '等待抽籤'}
                {!['won', 'lost', 'drawn', 'registered'].includes(registration?.status || '') && '未知狀態'}
              </span>
            </div>

            <div className="border-t border-b border-gray-200 py-4 mb-6">
              <table className="w-full">
                <tbody className="divide-y text-sm">
                  <tr>
                    <td className="py-2 font-medium">活動名稱</td>
                    <td className="py-2">{registration?.eventName || '未知活動'}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-medium">登記編號</td>
                    <td className="py-2">
                      {registration?.registrationToken || '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 font-medium">選擇區域</td>
                    <td className="py-2">{registration?.zoneName ? `${registration.zoneName}區` : '未指定區域'}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-medium">數量</td>
                    <td className="py-2">{registration?.quantity ? `${registration.quantity} 張` : '未指定數量'}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-medium">登記時間</td>
                    <td className="py-2">{formatDate(registration?.createdAt)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-medium">付款狀態</td>
                    <td className="py-2">
                      {registration?.paymentStatus === 'paid' ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">已付款</span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">未付款</span>
                      )}
                    </td>
                  </tr>
                  {registration?.paymentId && (
                    <tr>
                      <td className="py-2 font-medium">付款ID</td>
                      <td className="py-2">{registration.paymentId}</td>
                    </tr>
                  )}
                  {registration?.paidAt && (
                    <tr>
                      <td className="py-2 font-medium">付款時間</td>
                      <td className="py-2">{formatDate(registration.paidAt)}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="py-2 font-medium">抽籤日期</td>
                    <td className="py-2">{formatDate(registration?.drawDate)}</td>
                  </tr>
                  {registration?.status !== 'registered' && (
                    <tr>
                      <td className="py-2 font-medium">抽籤結果</td>
                      <td className="py-2">
                        {registration?.status === 'won' ? '中籤' : 
                         registration?.status === 'lost' ? '未中籤' : 
                         '未知結果'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold mb-2">抽籤流程說明</h3>
              <ol className="list-decimal pl-5 space-y-1 text-sm">
                <li>登記參與抽籤並支付平台費用</li>
                <li>系統在指定日期進行抽籤</li>
                <li>中籤者須在限定時間內完成購票</li>
                <li>未中籤者可參與其他活動抽籤</li>
              </ol>
            </div>

            {/* Payment Section - Add this section */}
            {registration?.paymentStatus === 'pending' && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-semibold text-yellow-800 mb-2">需要付款</h3>
                <p className="text-yellow-700 mb-4">
                  您需要支付平台費用以完成抽籤登記。平台費用為每張票券 HK$18。
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">
                    總金額: HK${((registration.quantity || 1) * 18).toLocaleString()}
                  </span>
                  <Link
                    href={`/events/${id}/lottery/payment?registrationToken=${registration.registrationToken}`}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  >
                    支付平台費用
                  </Link>
                </div>
              </div>
            )}

            <div className="flex justify-between gap-4">
              <Link 
                href="/user/lottery" 
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-center"
              >
                返回我的抽籤
              </Link>
              {registration?.status === 'won' && registration?.paymentStatus === 'pending' && (
                <Link 
                  href={`/events/${id}/lottery/payment?registrationToken=${registration.registrationToken}`}
                  className="flex-1 px-4 py-2 bg-green-500 text-white hover:bg-green-600 rounded text-center"
                >
                  立即購票
                </Link>
              )}
              <Link 
                href="/events" 
                className="flex-1 px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded text-center"
              >
                瀏覽更多活動
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
