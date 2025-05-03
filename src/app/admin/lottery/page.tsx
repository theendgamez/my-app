"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/navbar/Navbar';
import Sidebar from '@/components/admin/Sidebar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Link from 'next/link';

interface LotteryEvent {
  eventId: string;
  eventName: string;
  drawDate: string;
  status: string;
  registerCount: number;
  remainingDays: number;
}

export default function AdminLotteryPage() {
  const router = useRouter();
  const { isAdmin, isAuthenticated, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<LotteryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is admin, redirect if not
  useEffect(() => {
    if (!authLoading && isAuthenticated && !isAdmin) {
      router.push('/');
    }
    
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/admin/lottery');
    }
  }, [authLoading, isAuthenticated, isAdmin, router]);

  // Fetch lottery events
  useEffect(() => {
    const fetchLotteryEvents = async () => {
      try {
        setLoading(true);

        // Get current access token
        const accessToken = localStorage.getItem('accessToken') || '';

        const response = await fetch('/api/admin/lottery/events', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'x-user-id': localStorage.getItem('userId') || ''
          },
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          setEvents(data || []);
        } else {
          // Handle different error status codes
          if (response.status === 403) {
            setError('無權訪問抽籤管理。請確保您具有管理員權限。');
            console.error('Admin lottery access denied. Check user role permissions.');

            // Optional: could add redirect to login here
            setTimeout(() => {
              router.push('/login?redirect=/admin/lottery');
            }, 2000);
          } else {
            setError(`無法獲取抽籤活動資料: ${response.status}`);
          }
        }
      } catch (err) {
        console.error('Error fetching lottery events:', err);
        setError('獲取抽籤活動資料時發生錯誤');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && isAdmin) {
      fetchLotteryEvents();
    }
  }, [authLoading, isAdmin, router]);

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'registering':
        return 'bg-blue-100 text-blue-800';
      case 'drawing':
        return 'bg-purple-100 text-purple-800';
      case 'drawn':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!isAdmin) {
    return null; // This will prevent flash of content before redirect
  }

  return (
    <div>
      <Navbar />
      <div className="flex pt-16"> {/* Add pt-16 here to prevent navbar overlap */}
        <Sidebar />
        <div className="container mx-auto p-8 ml-64">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">抽籤活動管理</h1>
            <Link
              href="/admin/lottery/draw"
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              執行抽籤
            </Link>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
              <button 
                onClick={() => setError(null)} 
                className="ml-4 text-red-700 font-bold"
              >
                ×
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="large" />
            </div>
          ) : events.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow text-center">
              <p className="text-gray-600 mb-4">目前沒有抽籤模式的活動</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">活動名稱</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">抽籤日期</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">狀態</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">登記人數</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">剩餘天數</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {events.map((event) => (
                    <tr key={event.eventId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{event.eventName}</div>
                        <div className="text-xs text-gray-500">{event.eventId.substring(0, 8)}...</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {event.drawDate ? new Date(event.drawDate).toLocaleDateString() : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {event.drawDate ? new Date(event.drawDate).toLocaleTimeString() : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(event.status)}`}>
                          {event.status === 'registering' && '登記中'}
                          {event.status === 'drawing' && '抽籤進行中'}
                          {event.status === 'drawn' && '已抽籤'}
                          {event.status === 'closed' && '已結束'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.registerCount} 人
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {event.remainingDays > 0 ? (
                          <span className="text-green-600">{event.remainingDays} 天</span>
                        ) : (
                          <span className="text-red-600">0 天</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Link
                            href={`/admin/lottery/registrations/${event.eventId}`}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            查看登記
                          </Link>
                          {event.status === 'drawing' && (
                            <Link
                              href={`/admin/lottery/draw/${event.eventId}`}
                              className="text-purple-600 hover:text-purple-900"
                            >
                              執行抽籤
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
