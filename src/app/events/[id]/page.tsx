'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Events } from '@/types';
import Navbar from '@/components/navbar/Navbar';
import db from '@/lib/db';

const EventDetail = () => {
  const router = useRouter();
  const [event, setEvent] = useState<Events | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { id } = useParams();

  const fetchEvent = useCallback(async () => {
    try {
      const data = await db.events.findById(id as string)
      setEvent(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    fetchEvent(); // You'll need to define fetchEvent outside of useEffect for this to work
  };

  if (loading) return <div>Loading...</div>;
  if (error) return (
    <div>
      <p>{error}</p>
      <button onClick={handleRetry} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
        Retry
      </button>
    </div>
  );
  if (!event) return <div>Event not found</div>;

  const formatZonePrices = (zones: Array<{ name: string, price: string }> | null): string => {
    if (!zones?.length) return 'Free';
    return zones
      .map(zone => `HKD ${Number(zone.price).toLocaleString('en-HK')} ${zone.name}區`)
      .join(' / ');
  };

  const eventDate = event.eventDate ? new Date(event.eventDate) : null;
  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4 flex flex-col items-center pt-20">
        <h1 className="text-4xl font-bold mb-6 text-left w-full max-w-3xl px-6">{event.eventName || 'Untitled Event'}</h1>
        {event.photoUrl ? (
          <Image
            src={event.photoUrl}
            alt={event.eventName || 'Event image'}
            width={720}
            height={400}
            className="mb-6 rounded-lg shadow-lg"
          />
        ) : (
          <div className="mb-6 h-[400px] bg-gray-300 flex items-center justify-center rounded-lg shadow-md">
            <span className="text-gray-600">No image available</span>
          </div>
        )}
        <div className="w-full max-w-3xl px-6">
          <h2 className="text-2xl font-bold mb-4">活動資訊</h2>
        </div>
        <div className="text-sm text-left w-full max-w-3xl px-6">
          <p className="mb-2">
            <strong>活動名稱:</strong> {event.eventName || 'Untitled Event'}
          </p>
          <p className="mb-2">
            <strong>演出時間:</strong> {eventDate ? eventDate.toLocaleString() : 'Date not specified'}
          </p>
          <p className="mb-2">
            <strong>演出地點:</strong> {event.location || 'Location not specified'}
          </p>
          <p className="mb-2">
            <strong>簡介:</strong> {event.description || 'No description available'}
          </p>
          <p className="mb-2">
            <strong>門票價格:</strong> {formatZonePrices(event.zones)}
          </p>

          {event.isDrawMode ? (
            <>
              <p className="mb-2">
                <strong>報名開始日期:</strong> {event.registerDate ? new Date(event.registerDate).toLocaleString() : 'N/A'}
              </p>
              <p className="mb-2">
                <strong>報名結束日期:</strong> {event.endregisterDate ? new Date(event.endregisterDate).toLocaleString() : 'N/A'}
              </p>
              <p className="mb-2">
                <strong>抽籤日期:</strong> {event.drawDate ? new Date(event.drawDate).toLocaleString() : 'N/A'}
              </p>
            </>
          ) : (
            <p className="mb-2">
              <strong>開售日期:</strong> {event.onSaleDate ? new Date(event.onSaleDate).toLocaleString() : 'N/A'}
            </p>
          )}
        </div>
        <div className="w-full max-w-3xl px-6">
          <h2 className="text-2xl font-bold mb-4">注意事項</h2>
          <p>
            按主辦機構要求，所有演唱會觀眾所攜帶之隨身手提包/背包在進入演出場地前必須通過保安檢查。保安檢查會在表演時間前兩個小時開始。由於預計排隊進場時間會延長，我們建議觀眾盡早到達演出場地，請耐心等候並與保安人員合作。
          </p>
          <p>
            你可把個人物品存放在場地特設之服務台，多謝合作！
          </p>
          <h3 className="mt-4 text-lg font-semibold">以下物品不得攜帶進入演出場地：</h3>
          <ul className="list-decimal list-inside ml-4">
            <li>相機及任何錄影、錄音器材</li>
            <li>玻璃樽、鋁罐及膠樽（含或不含液體）</li>
            <li>手提袋/背包 (超過 12”x 15”) 或盛器</li>
            <li>外來食物及飲料</li>
            <li>長雨傘</li>
            <li>任何可能對他人造成傷害的危險物品</li>
            <li>任何可疑物品</li>
          </ul>
          <p className="mt-4">
            整個演出過程中禁止使用手機、平板電腦、相機和其他錄音設備。違者將被要求離開場地，恕不另行通知且不予退款或賠償。
          </p>
        </div>
        
        <div className="w-full max-w-3xl px-6">
          <h2 className="text-2xl font-bold mb-4">門票價格</h2>
          <table className="w-full max-w-3xl px-6">
            <thead>
              <tr>
                <th className="text-left">區域</th>
                {event.isDrawMode ? (
                  <>
                    <th className="text-right">報名開始日期</th>
                    <th className="text-right">報名結束日期</th>
                    <th className="text-right">抽籤日期</th>
                  </>
                ) : (
                  <th className="text-right">開售日期</th>
                )}
                <th className="text-right">價錢</th>
              </tr>
            </thead>
            <tbody>
              {event.zones?.map(zone => (
                <tr key={zone.name}>
                  <td>{zone.name}</td>
                  {event.isDrawMode ? (
                    <>
                      <td className="text-right">
                        {event.registerDate ? new Date(event.registerDate).toLocaleString() : 'N/A'}
                      </td>
                      <td className="text-right">
                        {event.endregisterDate ? new Date(event.endregisterDate).toLocaleString() : 'N/A'}
                      </td>
                      <td className="text-right">
                        {event.drawDate ? new Date(event.drawDate).toLocaleString() : 'N/A'}
                      </td>
                    </>
                  ) : (
                    <td className="text-right">
                      {event.onSaleDate ? new Date(event.onSaleDate).toLocaleString() : 'N/A'}
                    </td>
                  )}
                  <td className="text-right">HKD {Number(zone.price).toLocaleString('en-HK')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="w-full max-w-3xl px-6 mt-8">
          {event.isDrawMode ? (
            <>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">抽籤模式</h3>
                <p className="text-yellow-700 mb-2">
                  此活動採用抽籤模式分配門票。請在報名期間登記，抽籤結果將在抽籤日期後公佈。
                </p>
                <p className="text-sm text-yellow-600">
                  報名期間：{event.registerDate ? new Date(event.registerDate).toLocaleString() : 'N/A'} - 
                  {event.endregisterDate ? new Date(event.endregisterDate).toLocaleString() : 'N/A'}
                </p>
              </div>
              <button 
                onClick={() => router.push(`/events/${id}/lottery`)}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
              >
                抽籤登記
              </button>
            </>
          ) : (
            <button 
              onClick={() => router.push(`/events/${id}/booking`)}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
            >
              立即訂票
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export default EventDetail;