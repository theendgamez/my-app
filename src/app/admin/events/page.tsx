"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminPage from '@/components/admin/AdminPage';
import { Events } from '@/types';
import { adminFetch } from '@/utils/adminApi';
import { formatDate } from '@/utils/formatters'; // Import the new formatter

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Events[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState<string | null>(null);

  // Fetch events
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await adminFetch<Events[] | { events: Events[] }>('/api/events');
      
      // Check if the response is an error object
      if ('error' in data && 'status' in data) {
        throw new Error(`API Error: ${data.error}`);
      }
      
      // Handle both array response and object response
      let eventsArray: Events[];
      if (Array.isArray(data)) {
        eventsArray = data;
      } else if ('events' in data && Array.isArray(data.events)) {
        eventsArray = data.events;
      } else {
        throw new Error('Invalid data format: expected an array of events or events object');
      }
      
      setEvents(eventsArray);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err instanceof Error ? err.message : '獲取活動數據時出錯');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('確定要刪除此活動嗎？此操作無法撤銷。')) {
      return;
    }

    try {
      setDeleteInProgress(eventId);
      
      await adminFetch(`/api/events/${eventId}`, {
        method: 'DELETE'
      });

      // Remove from UI without refetching
      setEvents(events.filter(event => event.eventId !== eventId));
    } catch (err) {
      console.error('Error deleting event:', err);
      setError(err instanceof Error ? err.message : '刪除活動時發生錯誤');
    } finally {
      setDeleteInProgress(null);
    }
  };

  // Create action button component
  const actionButton = (
    <Link
      href="/admin/create-event"
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
    >
      創建新活動
    </Link>
  );

  return (
    <AdminPage 
      title="管理活動" 
      isLoading={loading}
      error={error}
      actionButton={actionButton}
    >
      {/* Check if events is an array and has length before trying to map over it */}
      {Array.isArray(events) && events.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-gray-600 mb-4">尚未創建任何活動</p>
          <Link
            href="/admin/create-event"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            創建第一個活動
          </Link>
        </div>
      ) : Array.isArray(events) ? (
        <div className="overflow-hidden">
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
                      {event.eventDate ? formatDate(event.eventDate, undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }) : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {event.eventDate ? formatDate(event.eventDate, undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : ''}
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
      ) : (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-red-600 mb-4">無法加載活動數據</p>
          <button 
            onClick={fetchEvents}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            重試
          </button>
        </div>
      )}
    </AdminPage>
  );
}
