"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/utils/fetchWithAuth';
import Image from 'next/image';
import Link from 'next/link';

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
  registerDate?: string;
  endregisterDate?: string;
  drawDate?: string;
  onSaleDate?: string;
  zones?: EventZone[];
  category?: string;
}

export default function EventDetails() {
  const params = useParams();
  const eventId = params?.id as string;
  const router = useRouter();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Event>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!eventId) return;

    async function fetchEvent() {
      try {
        setLoading(true);
        const response = await fetchWithAuth(`/api/events/${eventId}`);
        
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            router.push('/login');
            return;
          }
          if (response.status === 404) {
            setError('活動不存在');
            return;
          }
          throw new Error('Failed to fetch event');
        }
        
        const data = await response.json();
        setEvent(data);
        setFormData(data);
      } catch (err) {
        console.error('Error fetching event:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchEvent();
  }, [eventId, router]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const saveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!event) return;
    
    try {
      setSaving(true);
      
      const response = await fetchWithAuth(`/api/events/${eventId}`, {
        method: 'PATCH',
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save event');
      }
      
      const updatedEvent = await response.json();
      setEvent(updatedEvent);
      setEditMode(false);
      
    } catch (err) {
      console.error('Error saving event:', err);
      setError(err instanceof Error ? err.message : 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const performDraw = async () => {
    if (!event || !event.isDrawMode) return;
    
    if (!confirm('確定要執行抽籤嗎？此操作將選擇中獎者並通知他們。')) {
      return;
    }
    
    try {
      const response = await fetchWithAuth('/api/lottery/draw', {
        method: 'POST',
        body: JSON.stringify({ eventId })
      });
      
      if (!response.ok) {
        throw new Error('抽籤失敗');
      }
      
      const result = await response.json();
      alert(`抽獎成功！已選出 ${result.winnerCount} 位中獎者。`);
      
    } catch (err) {
      console.error('Error performing draw:', err);
      setError(err instanceof Error ? err.message : 'Failed to perform draw');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-red-600 mb-4">Error</h2>
        <p className="text-gray-700 mb-4">{error || '找不到活動'}</p>
        <Link 
          href="/admin/events"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 inline-block"
        >
          返回活動列表
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {editMode ? '編輯活動' : '活動詳情'}
        </h1>
        <div className="flex space-x-3">
          <Link 
            href="/admin/events"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            返回列表
          </Link>
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              編輯活動
            </button>
          ) : (
            <button
              onClick={() => setEditMode(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              取消編輯
            </button>
          )}
        </div>
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
        {editMode ? (
          <form onSubmit={saveEvent} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">活動名稱</label>
                <input
                  type="text"
                  name="eventName"
                  value={formData.eventName || ''}
                  onChange={handleFormChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">活動地點</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location || ''}
                  onChange={handleFormChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">活動日期</label>
                <input
                  type="datetime-local"
                  name="eventDate"
                  value={formData.eventDate ? new Date(formData.eventDate).toISOString().slice(0, 16) : ''}
                  onChange={handleFormChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">狀態</label>
                <select
                  name="status"
                  value={formData.status || ''}
                  onChange={handleFormChange}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="Prepare">準備中</option>
                  <option value="Active">進行中</option>
                  <option value="Completed">已完成</option>
                  <option value="Cancelled">已取消</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分類</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category || ''}
                  onChange={handleFormChange}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">活動描述</label>
              <textarea
                name="description"
                value={formData.description || ''}
                onChange={handleFormChange}
                className="w-full p-2 border rounded min-h-[100px]"
                required
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                disabled={saving}
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                disabled={saving}
              >
                {saving ? '儲存中...' : '儲存變更'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="relative h-60 w-full mb-6">
              <Image
                src={event.photoUrl || '/img/default-event.jpg'}
                alt={event.eventName}
                fill
                className="object-cover rounded-lg"
                sizes="(max-width: 768px) 100vw, 768px"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">基本資訊</h3>
                <div className="space-y-3">
                  <DetailItem label="活動名稱" value={event.eventName} />
                  <DetailItem label="活動地點" value={event.location} />
                  <DetailItem label="活動日期" value={new Date(event.eventDate).toLocaleString()} />
                  <DetailItem label="創建日期" value={new Date(event.createdAt).toLocaleString()} />
                  <DetailItem label="活動狀態" value={event.status} valueType="status" />
                  <DetailItem label="銷售模式" value={event.isDrawMode ? '抽籤' : '一般'} />
                  <DetailItem label="分類" value={event.category || 'N/A'} />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">票區資訊</h3>
                {event.zones && event.zones.length > 0 ? (
                  <div className="space-y-4">
                    {event.zones.map((zone, index) => (
                      <div key={index} className="border p-3 rounded">
                        <div className="font-medium">{zone.name}</div>
                        <div className="text-sm text-gray-600">
                          <div>價格: HK${zone.price}</div>
                          <div>總票數: {zone.zoneQuantity}</div>
                          <div>單人最多票數: {zone.max}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500">無票區資訊</div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">活動描述</h3>
              <div className="bg-gray-50 p-4 rounded">
                {event.description}
              </div>
            </div>

            {event.isDrawMode && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">抽籤資訊</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DetailItem label="登記開始日期" value={event.registerDate ? new Date(event.registerDate).toLocaleString() : 'N/A'} />
                  <DetailItem label="登記結束日期" value={event.endregisterDate ? new Date(event.endregisterDate).toLocaleString() : 'N/A'} />
                  <DetailItem label="抽籤日期" value={event.drawDate ? new Date(event.drawDate).toLocaleString() : 'N/A'} />
                  
                  <div className="md:col-span-2 mt-2">
                    <button 
                      onClick={performDraw}
                      className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
                    >
                      執行抽籤
                    </button>
                    <span className="text-xs text-gray-500 ml-2">
                      此操作將隨機選擇中獎者並發送通知
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailItem({ label, value, valueType }: { label: string; value: string; valueType?: string }) {
  let displayValue = value;
  
  if (valueType === 'status') {
    const statusMap: Record<string, string> = {
      'Prepare': '準備中',
      'Active': '進行中',
      'Completed': '已完成',
      'Cancelled': '已取消'
    };
    displayValue = statusMap[value] || value;
  }
  
  return (
    <div className="flex">
      <span className="font-medium text-gray-600 w-28">{label}:</span>
      <span className="flex-1">{displayValue}</span>
    </div>
  );
}
