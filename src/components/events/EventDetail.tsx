import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Events } from '@/types';
import Navbar from '@/components/navbar/Navbar';
import db from '@/lib/db';

// This component contains all the dynamic logic moved from events/[id]/page.tsx
export default function EventDetail() {
  const router = useRouter();
  const [event, setEvent] = useState<Events | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const id = params && typeof params.id === 'string'
    ? params.id
    : Array.isArray(params?.id)
      ? params.id[0]
      : undefined;
 
  const fetchEvent = useCallback(async () => {
    try {
      if (!id) {
        throw new Error('Event ID is required');
      }
      
      const data = await db.events.findById(id)
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

  // Function to handle action buttons
  const handleAction = (action: string) => {
    if (!event) return;

    switch (action) {
      case 'book':
        router.push(`/events/${event.eventId}/booking`);
        break;
      case 'lottery':
        router.push(`/events/${event.eventId}/lottery`);
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto p-4 pt-20 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </>
    );
  }

  if (error || !event) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto p-4 pt-20">
          <div className="bg-red-50 p-4 rounded-md border border-red-200 text-red-700">
            <h2 className="text-lg font-semibold mb-2">Error</h2>
            <p>{error || 'Event not found'}</p>
            <button 
              onClick={() => router.push('/events')} 
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Back to Events
            </button>
          </div>
        </div>
      </>
    );
  }

  // Format event date for display
  const formattedDate = new Date(event.eventDate).toLocaleDateString('zh-HK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4 pt-20">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="relative h-64 sm:h-96">
            <Image
              src={event.photoUrl || '/images/default-event.jpg'}
              alt={event.eventName}
              className="object-cover"
              fill
              priority
            />
          </div>
          
          <div className="p-6">
            <h1 className="text-3xl font-bold mb-2">{event.eventName}</h1>
            
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                {event.status}
              </span>
              {event.isDrawMode && (
                <span className="inline-block bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
                  抽籤制
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">活動詳情</h2>
                <div className="space-y-2">
                  <p className="flex items-center text-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{formattedDate}</span>
                  </p>
                  <p className="flex items-center text-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{event.location}</span>
                  </p>
                </div>
              </div>
              
              <div>
                <h2 className="text-xl font-semibold mb-4">票價資訊</h2>
                <div className="space-y-2">
                  {event.zones?.map((zone) => (
                    <div key={zone.name} className="flex justify-between py-2 border-b">
                      <span className="font-medium">{zone.name}</span>
                      <span className="text-blue-600">HK${zone.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">活動介紹</h2>
              <p className="text-gray-700 whitespace-pre-line">{event.description}</p>
            </div>
            
            {/* Action buttons */}
            <div className="flex flex-wrap gap-4">
              {event.isDrawMode ? (
                <button 
                  onClick={() => handleAction('lottery')} 
                  className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  參加抽籤
                </button>
              ) : (
                <button 
                  onClick={() => handleAction('book')} 
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  立即購票
                </button>
              )}
              <button 
                onClick={() => router.push('/events')}
                className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
              >
                返回活動列表
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
