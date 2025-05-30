'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navbar/Navbar';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import Link from 'next/link';
import { Registration } from '@/types';

export default function UserLotteryPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check authentication first
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/user/lottery');
      return;
    }

    // Fetch user's lottery registrations
    const fetchRegistrations = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/registrations/lottery', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
            'x-user-id': user?.userId || ''
          }
        });

        if (!response.ok) {
          throw new Error('無法獲取抽籤登記');
        }

        const data = await response.json();
        setRegistrations(data.registrations || []);
      } catch (err) {
        console.error('Error fetching registrations:', err);
        setError(err instanceof Error ? err.message : '無法獲取抽籤登記');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchRegistrations();
    }
  }, [isAuthenticated, authLoading, router, user]);

  const getStatusBadge = (reg: Registration) => {
    const { status, platformFeePaid, ticketsPurchased, paymentStatus } = reg;

    if (status === 'won') {
      if (ticketsPurchased) {
        return <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded">已購票</span>;
      } else if (platformFeePaid) { // Won, platform fee paid, but tickets not yet purchased
        return <span className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">已中籤 (待購票)</span>;
      } else { // Won, but platform fee not paid (implies it's the next step)
        return <span className="inline-block px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">已中籤 (待付平台費)</span>;
      }
    } else if (status === 'registered') {
      if (!platformFeePaid) {
        return <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">等待抽籤 (待付平台費)</span>;
      } else {
        return <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">等待抽籤</span>;
      }
    } else if (status === 'lost') {
      return <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">未中籤</span>;
    } else if (status === 'drawn') {
        return <span className="inline-block px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">已開獎</span>;
    } else if (paymentStatus === 'pending' && !platformFeePaid && !ticketsPurchased) {
        return <span className="inline-block px-2 py-1 text-xs bg-red-100 text-red-800 rounded">未付款</span>;
    }
    // Fallback for other statuses like 'cancelled', 'error', 'processing'
    return <span className="inline-block px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">{status || '未知'}</span>;
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

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4 pt-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">我的抽籤記錄</h1>
          
          {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />}
          
          {registrations.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow-md text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-xl font-semibold mb-2">暫無抽籤記錄</h2>
              <p className="text-gray-600 mb-4">您還沒有參與任何活動的抽籤</p>
              <Link 
                href="/" 
                className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                瀏覽活動
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">活動</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">區域</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">數量</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">抽籤日期</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">狀態</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {registrations.map((reg) => (
                      <tr key={reg.registrationToken} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{reg.eventName}</div>
                          <div className="text-xs text-gray-500">{reg.registrationToken.substring(0, 8)}...</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{reg.zoneName}區</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{reg.quantity} 張</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {reg.drawDate ? new Date(reg.drawDate).toLocaleDateString() : '—'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(reg)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {reg.status === 'registered' && !reg.platformFeePaid ? (
                            <Link
                              href={`/events/${reg.eventId}/lottery/payment?registrationToken=${reg.registrationToken}`}
                              className="text-red-600 hover:text-red-900"
                            >
                              支付平台費
                            </Link>
                          ) : reg.status === 'won' && !reg.platformFeePaid ? (
                            <Link
                              href={`/events/${reg.eventId}/lottery/payment?registrationToken=${reg.registrationToken}`}
                              className="text-orange-600 hover:text-orange-900"
                            >
                              支付平台費
                            </Link>
                          ) : reg.status === 'won' && reg.platformFeePaid && !reg.ticketsPurchased ? (
                            <Link
                              href={`/events/${reg.eventId}/lottery/payment?registrationToken=${reg.registrationToken}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              購買門票
                            </Link>
                          ) : reg.ticketsPurchased ? (
                            <Link 
                              href={`/user/order`}
                              className="text-green-600 hover:text-green-900"
                            >
                              查看門票
                            </Link>
                          ) : (
                            <Link 
                              href={`/events/${reg.eventId}/lottery/details?registrationToken=${reg.registrationToken}`}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              查看詳情
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4">
                <button
                  onClick={() => router.push('/user/order')}
                  className="px-6 py-2 rounded bg-gray-200 hover:bg-gray-300"
                >
                  查看我的票券
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
