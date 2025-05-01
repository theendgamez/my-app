"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/navbar/Navbar';
import Sidebar from '@/components/ui/Sidebar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Events } from '@/types';
import Link from 'next/link';

export default function AdminEventsPage() {
  const router = useRouter();
  const { isAdmin, isAuthenticated, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<Events[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState<string | null>(null);

  // Check if user is admin, redirect if not
  useEffect(() => {
    if (!authLoading && isAuthenticated && !isAdmin) {
      // Not admin, redirect to home
      router.push('/');
    }
    
    if (!authLoading && !isAuthenticated) {
      // Not logged in, redirect to login
      router.push('/login?redirect=/admin/events');
    }
  }, [authLoading, isAuthenticated, isAdmin, router]);

  // Fetch events
  useEffect(() => {
    if (!authLoading && isAdmin) {
      fetchEvents();
    }
  }, [authLoading, isAdmin]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/events');
      if (response.ok) {
        const data = await response.json();
        setEvents(data || []);
      } else {
        setError('無法獲取活動資料');
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('獲取活動資料時發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('確定要刪除這個活動嗎？此操作無法撤銷。')) {
      return;
    }

    try {
      setDeleteInProgress(eventId);
      const accessToken = localStorage.getItem('accessToken');
      
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken || ''}`,
        }
      });

      if (response.ok) {
        // Remove from UI without refetching
        setEvents(events.filter(event => event.eventId !== eventId));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || '刪除失敗');
      }
    } catch (err) {
      console.error('Error deleting event:', err);
      setError(err instanceof Error ? err.message : '刪除活動時發生錯誤');
    } finally {
      setDeleteInProgress(null);
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
      <div className="flex">
        <Sidebar />
        <div className="container mx-auto p-8 ml-64">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">管理活動</h1>
            <Link
              href="/admin/create-event"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              創建新活動
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
              <p className="text-gray-600 mb-4">尚未創建任何活動</p>
              <Link
                href="/admin/create-event"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                創建第一個活動
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">活動名稱</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日期</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">地點</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">銷售模式</th>
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
                          {event.eventDate ? new Date(event.eventDate).toLocaleDateString() : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {event.eventDate ? new Date(event.eventDate).toLocaleTimeString() : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{event.location}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          event.isDrawMode ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {event.isDrawMode ? '抽籤模式' : '直接售票'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Link
                            href={`/events/${event.eventId}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            查看
                          </Link>
                          <Link
                            href={`/admin/events/edit/${event.eventId}`}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            編輯
                          </Link>
                          <button
                            onClick={() => handleDeleteEvent(event.eventId)}
                            disabled={deleteInProgress === event.eventId}
                            className={`text-red-600 hover:text-red-900 ${deleteInProgress === event.eventId ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {deleteInProgress === event.eventId ? '刪除中...' : '刪除'}
                          </button>
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
