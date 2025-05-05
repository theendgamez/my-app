"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

interface DrawResult {
  success: boolean;
  message: string;
  stats: {
    total: number;
    winners: number;
    losers: number;
  };
  results: Array<{
    registrationToken: string;
    userId: string;
    result: string;
    zoneName: string;
    quantity: number;
  }>;
}

// Client component that uses useSearchParams
function LotteryDrawContent() {
  const router = useRouter();
  const { isAdmin, isAuthenticated, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<LotteryEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [drawResult, setDrawResult] = useState<DrawResult | null>(null);

  // Use the imported hook directly
  const searchParams = useSearchParams();
  const eventIdFromQuery = searchParams?.get('eventId');

  // Check if user is admin, redirect if not
  useEffect(() => {
    if (!authLoading && isAuthenticated && !isAdmin) {
      router.push('/');
    }

    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/admin/lottery/draw');
    }
  }, [authLoading, isAuthenticated, isAdmin, router]);

  // Fetch lottery events
  useEffect(() => {
    if (!authLoading && isAdmin) {
      fetchDrawableEvents();
    }
  }, [authLoading, isAdmin]);

  // Set the selected event from query parameter if available
  useEffect(() => {
    if (eventIdFromQuery && events.some(event => event.eventId === eventIdFromQuery)) {
      setSelectedEvent(eventIdFromQuery);
    }
  }, [eventIdFromQuery, events]);

  const fetchDrawableEvents = async () => {
    try {
      setLoading(true);
      const accessToken = localStorage.getItem('accessToken') || '';

      const response = await fetch('/api/admin/lottery/events', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-user-id': localStorage.getItem('userId') || ''
        },
        credentials: 'include'
      });

      if (response.ok) {
        const allEvents = await response.json();
        // Filter events that are in "drawing" status
        const drawableEvents = allEvents.filter(
          (event: LotteryEvent) => event.status === 'drawing'
        );
        setEvents(drawableEvents);
      } else {
        setError('無法獲取可抽籤的活動資料');
      }
    } catch (err) {
      console.error('Error fetching lottery events:', err);
      setError('獲取可抽籤活動資料時發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  const executeDraw = async () => {
    if (!selectedEvent) {
      setError('請選擇一個活動進行抽籤');
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      setSuccess(null);

      const accessToken = localStorage.getItem('accessToken') || '';

      const response = await fetch('/api/lottery/draw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-user-id': localStorage.getItem('userId') || ''
        },
        body: JSON.stringify({ eventId: selectedEvent })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`抽籤成功！共有 ${data.stats.winners} 人中籤`);
        setDrawResult(data);
      } else {
        setError(data.error || '抽籤過程中發生錯誤');
      }
    } catch (err) {
      console.error('Draw execution error:', err);
      setError('執行抽籤時發生錯誤');
    } finally {
      setProcessing(false);
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
      <div className="container mx-auto p-8 ml-64 pt-20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">執行抽籤</h1>
          <Link
            href="/admin/lottery"
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            返回抽籤管理
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

        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
            <button
              onClick={() => setSuccess(null)}
              className="ml-4 text-green-700 font-bold"
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
            <p className="text-gray-600 mb-4">沒有可進行抽籤的活動</p>
            <p className="text-sm text-gray-500">只有報名期結束但尚未抽籤的活動才能進行抽籤</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">選擇活動進行抽籤</h2>
            <p className="text-red-500 text-sm mb-4">
              注意：抽籤操作不可撤銷。抽籤結果將立即通知所有參與者。
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                選擇活動:
              </label>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- 請選擇活動 --</option>
                {events.map((event) => (
                  <option key={event.eventId} value={event.eventId}>
                    {event.eventName} ({event.registerCount} 人報名)
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={executeDraw}
              disabled={!selectedEvent || processing}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed"
            >
              {processing ? '抽籤中...' : '執行抽籤'}
            </button>
          </div>
        )}

        {drawResult && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">抽籤結果</h2>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <p className="text-sm text-blue-500">總參與人數</p>
                <p className="text-xl font-bold">{drawResult.stats.total}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <p className="text-sm text-green-500">中籤人數</p>
                <p className="text-xl font-bold">{drawResult.stats.winners}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-500">未中籤人數</p>
                <p className="text-xl font-bold">{drawResult.stats.losers}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">結果明細</h3>
              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        登記編號
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        區域
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        數量
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        結果
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {drawResult.results.map((result) => (
                      <tr key={result.registrationToken}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {result.registrationToken.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {result.zoneName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {result.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              result.result === 'won'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {result.result === 'won' ? '中籤' : '未中籤'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminLotteryDrawPage() {
  return (
    <>
      <Navbar />
      <div className="flex">
        <Sidebar />
        <div className="flex-1">
          {/* Wrap the component using useSearchParams with Suspense */}
          <Suspense
            fallback={
              <div className="flex justify-center items-center h-screen">
                <LoadingSpinner />
              </div>
            }
          >
            <LotteryDrawContent />
          </Suspense>
        </div>
      </div>
    </>
  );
}
