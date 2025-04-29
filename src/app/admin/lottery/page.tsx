'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navbar/Navbar';
import Sidebar from '@/components/admin/Sidebar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import { fetchWithAuth } from '@/utils/fetchWithAuth';

export default function AdminLotteryPage() {
  const router = useRouter();
  interface LotteryEvent {
    eventId: string;
    eventName: string;
    isDrawMode: boolean;
    drawDate: string;
    isDrawn: boolean;
  }
  const [events, setEvents] = useState<LotteryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch lottery events
    const fetchLotteryEvents = async () => {
      try {
        const response = await fetchWithAuth('/api/events?isDrawMode=true');
        // Filter events that are eligible for drawing (have a draw date and not already drawn)
        interface LotteryEvent {
          eventId: string;
          eventName: string;
          isDrawMode: boolean;
          drawDate: string;
          isDrawn: boolean;
        }

        const data: LotteryEvent[] = await response.json();

        const eligibleEvents: LotteryEvent[] = data.filter(event => 
          event.isDrawMode && 
          event.drawDate &&
          !event.isDrawn && 
          new Date(event.drawDate) <= new Date()
        );
        
        setEvents(eligibleEvents);
      } catch (err) {
        console.error('Error fetching lottery events:', err);
        setError('無法載入抽籤活動列表');
      } finally {
        setLoading(false);
      }
    };

    fetchLotteryEvents();
  }, []);

  interface DrawResultStats {
    winners: number;
    [key: string]: any;
  }

  interface DrawResult {
    stats: DrawResultStats;
    [key: string]: any;
  }

  const startDraw = async (eventId: string): Promise<void> => {
    if (processing) return;
    
    if (!confirm('確定要開始抽籤嗎？此操作無法撤銷。')) {
      return;
    }
    
    try {
      setProcessing(true);
      setSuccess(null);
      setError(null);
      
      const response = await fetchWithAuth('/api/lottery/draw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId }),
      });

      const result: DrawResult = await response.json();
      
      setSuccess(`抽籤完成！共有 ${result.stats.winners} 位中籤者。`);
      
      // Remove this event from the list or mark as drawn
      setEvents(events.filter((event) => event.eventId !== eventId));
    } catch (err) {
      console.error('Error starting lottery draw:', err);
      setError(err instanceof Error ? err.message : '抽籤過程中發生錯誤');
    } finally {
      setProcessing(false);
    }
  };

  interface ViewResultsFn {
    (eventId: string): void;
  }

  const viewResults: ViewResultsFn = (eventId) => {
    router.push(`/admin/lottery/${eventId}/results`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar isAdmin={true} />
        <div className="flex-1 p-8 ml-64 mt-16">
          <h1 className="text-2xl font-bold mb-6">活動抽籤管理</h1>
          
          {success && (
            <Alert type="success" message={success} onClose={() => setSuccess(null)} className="mb-4" />
          )}
          
          {error && (
            <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />
          )}
          
          {loading ? (
            <div className="flex justify-center my-12">
              <LoadingSpinner size="large" />
            </div>
          ) : events.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <p className="text-gray-500 text-center py-8">目前沒有可抽籤的活動</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.eventId} className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-semibold mb-2">{event.eventName}</h2>
                      <p className="text-gray-600 mb-1">
                        抽籤日期: {new Date(event.drawDate).toLocaleString()}
                      </p>
                      <p className="text-gray-600">
                        狀態: {event.isDrawn ? '已抽籤' : '待抽籤'}
                      </p>
                    </div>
                    <div className="space-x-3">
                      <button
                        onClick={() => startDraw(event.eventId)}
                        disabled={processing || event.isDrawn}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {processing ? '處理中...' : '開始抽籤'}
                      </button>
                      <button
                        onClick={() => viewResults(event.eventId)}
                        className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                      >
                        查看結果
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
