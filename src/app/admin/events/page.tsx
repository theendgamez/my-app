"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/utils/fetchWithAuth';
import Link from 'next/link';
import Image from 'next/image';

interface EventZone {
  name: string;
  price: string;
  zoneQuantity: number;
  max: number;
}

interface Event {
  eventId: string;
  eventName: string;
  description: string;
  eventDate: string;
  location: string;
  photoUrl: string;
  status: string;
  createdAt: string;
  isDrawMode: boolean;
  zones?: EventZone[];
}

export default function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const router = useRouter();

  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        const response = await fetchWithAuth('/api/events');
        
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch events');
        }
        
        const data = await response.json();
        setEvents(data);
      } catch (err) {
        console.error('Error fetching events:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [router]);

  const deleteEvent = async (eventId: string) => {
    if (!confirm('確定要刪除此活動嗎？此操作無法撤銷。')) {
      return;
    }

    try {
      const response = await fetchWithAuth(`/api/events/${eventId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }

      // Remove the deleted event from the state
      setEvents(events.filter(event => event.eventId !== eventId));
    } catch (err) {
      console.error('Error deleting event:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete event');
    }
  };

  // Filter events based on search term and status filter
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const updateEventStatus = async (eventId: string, newStatus: string) => {
    try {
      const response = await fetchWithAuth(`/api/events/${eventId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update event status');
      }

      // Update the event in state
      setEvents(events.map(event => 
        event.eventId === eventId ? { ...event, status: newStatus } : event
      ));
    } catch (err) {
      console.error('Error updating event status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update event status');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">活動管理</h1>
        <Link 
          href="/admin/create-event"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          建立新活動
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          {error}
          <button
            className="absolute top-0 bottom-0 right-0 px-4"
            onClick={() => setError(null)}
          >
            &times;
          </button>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜尋活動..."
              className="w-full p-2 border rounded"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <select
              className="w-full p-2 border rounded"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">所有狀態</option>
              <option value="Prepare">準備中</option>
              <option value="Active">進行中</option>
              <option value="Completed">已完成</option>
              <option value="Cancelled">已取消</option>
            </select>
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="text-center py-6 text-gray-500">無匹配的活動</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 text-left">活動名稱</th>
                  <th className="py-2 px-4 text-left">日期</th>
                  <th className="py-2 px-4 text-left">地點</th>
                  <th className="py-2 px-4 text-left">狀態</th>
                  <th className="py-2 px-4 text-left">模式</th>
                  <th className="py-2 px-4 text-left">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEvents.map((event) => (
                  <tr key={event.eventId} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="relative w-10 h-10">
                          <Image
                            src={event.photoUrl || '/img/default-event.jpg'}
                            alt={event.eventName}
                            className="object-cover rounded"
                            fill
                            sizes="40px"
                          />
                        </div>
                        <span className="font-medium">{event.eventName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {new Date(event.eventDate).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">{event.location}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={event.status} />
                    </td>
                    <td className="py-3 px-4">
                      {event.isDrawMode ? (
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">抽籤</span>
                      ) : (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">普通</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <Link 
                          href={`/admin/events/${event.eventId}`}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          詳情
                        </Link>
                        <button
                          onClick={() => {
                            const newStatus = event.status === 'Active' ? 'Completed' : 'Active';
                            updateEventStatus(event.eventId, newStatus);
                          }}
                          className="text-yellow-500 hover:text-yellow-700"
                        >
                          {event.status === 'Active' ? '完成' : '啟用'}
                        </button>
                        <button
                          onClick={() => deleteEvent(event.eventId)}
                          className="text-red-500 hover:text-red-700"
                        >
                          刪除
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
  );
}

function StatusBadge({ status }: { status: string }) {
  let bgColor, textColor, statusText;

  switch (status) {
    case 'Prepare':
      bgColor = 'bg-yellow-100';
      textColor = 'text-yellow-800';
      statusText = '準備中';
      break;
    case 'Active':
      bgColor = 'bg-green-100';
      textColor = 'text-green-800';
      statusText = '進行中';
      break;
    case 'Completed':
      bgColor = 'bg-blue-100';
      textColor = 'text-blue-800';
      statusText = '已完成';
      break;
    case 'Cancelled':
      bgColor = 'bg-red-100';
      textColor = 'text-red-800';
      statusText = '已取消';
      break;
    default:
      bgColor = 'bg-gray-100';
      textColor = 'text-gray-800';
      statusText = status;
  }

  return (
    <span className={`${bgColor} ${textColor} px-2 py-1 rounded text-xs`}>
      {statusText}
    </span>
  );
}
