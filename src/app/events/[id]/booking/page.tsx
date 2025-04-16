'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/navbar/Navbar';
import { useAuth } from '@/context/AuthContext';
import { Events } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';

const PLATFORM_FEE = 18; // Platform fee per ticket in HKD

// Create a server action to securely fetch event data
async function getEventDetails(eventId: string) {
  try {
    // Instead of using the API route, use the client-side db directly
    // since we're in a client component
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    
    // Try fetching directly from the db utility first
    try {
      // Using dynamic import to avoid SSR issues with db
      const { default: db } = await import('@/lib/db');
      const data = await db.events.findById(eventId);
      
      if (!data) {
        throw new Error('Event not found');
      }
      
      return data;
    } catch (dbError) {
      console.error('Error fetching from db directly:', dbError);
      
      // Fallback to API request if db direct access fails
      const res = await fetch(`${origin}/api/events/${eventId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!res.ok) {
        // Try a different API path if the first one fails
        const altRes = await fetch(`${origin}/api/event/${eventId}`, {
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });
        
        if (!altRes.ok) {
          throw new Error(`Failed to fetch event (Status ${res.status})`);
        }
        
        return altRes.json();
      }
      
      return res.json();
    }
  } catch (error) {
    console.error('Error fetching event details:', error);
    throw error instanceof Error ? error : new Error('Unknown error fetching event');
  }
}

const BookingPage = () => {
  const router = useRouter();
  const { id } = useParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [event, setEvent] = useState<Events | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Check authentication first
    if (!authLoading && !isAuthenticated) {
      // Store the current path for redirect after login
      const currentPath = `/events/${id}/booking`;
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    const fetchEventDetails = async () => {
      try {
        setLoading(true);
        setError(null); // Reset error state
        
        // Check if id is valid
        if (!id) {
          throw new Error('Invalid event ID');
        }
        
        const data = await getEventDetails(id as string);
        setEvent(data);
      } catch (error) {
        console.error('Error fetching event:', error);
        setError(error instanceof Error 
          ? error.message 
          : 'Unable to load event details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchEventDetails();
    }
  }, [id, isAuthenticated, authLoading, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isProcessing) return;
    
    // Additional validations
    if (!selectedZone) {
      setError('請選擇區域');
      return;
    }
    
    // Check that zone has available tickets
    const zoneDetails = event?.zones?.find(z => z.name === selectedZone);
    if (!zoneDetails || (zoneDetails.zoneQuantity && zoneDetails.zoneQuantity < quantity)) {
      setError(`所選區域的票券不足，目前僅剩 ${zoneDetails?.zoneQuantity || 0} 張`);
      return;
    }

    // Generate a session ID and create a booking intent
    const sessionId = crypto.randomUUID();
    
    setIsProcessing(true);
    
    // Create a secure booking token
    fetch(`/api/bookings/create-intent`, {
      method: 'POST',
      credentials: 'include', // Ensure cookies are sent
      headers: {
        'Content-Type': 'application/json',
        // Add Authorization header as backup authentication method
        ...(user ? { 'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}` } : {})
      },
      body: JSON.stringify({
        eventId: id,
        userId: user?.userId,
        zone: selectedZone,
        quantity,
        sessionId
      })
    })
    .then(async res => {
      if (!res.ok) {
        // For 401 errors, attempt to refresh authentication
        if (res.status === 401) {
          console.error('Authentication failed - redirecting to login');
          // Store the current path including query params for redirect after login
          const currentPath = `/events/${id}/booking`;
          router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
          return { error: 'Please login to continue' };
        }
        // Get the error message from the response
        const errorData = await res.json();
        throw new Error(errorData.error || `API error: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Save event data to sessionStorage before navigating
      // This helps maintain context if the user needs to go back
      try {
        const eventStateToSave = {
          eventName: event?.eventName,
          eventDate: event?.eventDate,
          selectedZone,
          quantity,
          price: {
            ticketPrice: selectedZoneDetails?.price || 0,
            platformFee: PLATFORM_FEE,
            total: totalPrice
          }
        };
        sessionStorage.setItem(`booking_${id}`, JSON.stringify(eventStateToSave));
      } catch (err) {
        console.warn('Could not save booking state to session storage', err);
      }
      
      // Navigate to payment page with the secure booking token
      router.push(`/events/${id}/payment?bookingToken=${data.bookingToken}`);
    })
    .catch(err => {
      console.error('Booking intent error:', err);
      setError(err.message || 'Unable to create booking. Please try again.');
    })
    .finally(() => {
      setIsProcessing(false);
    });
  };

  // Handle back navigation properly
  const handleBackNavigation = () => {
    // Try to go back to event details instead of using browser history
    router.push(`/events/${id}`);
  };

  // Calculate prices outside the if-statements to avoid duplication
  const selectedZoneDetails = event?.zones?.find(z => z.name === selectedZone);
  const ticketPrice = selectedZoneDetails ? Number(selectedZoneDetails.price) : 0;
  const platformFeeTotal = PLATFORM_FEE * quantity;
  const subtotal = ticketPrice * quantity;
  const totalPrice = subtotal + platformFeeTotal;

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

  if (error && !event) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto p-4 pt-20">
          <Alert type="error" title="Error" message={error} />
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => router.push('/events')}
              className="px-6 py-2 rounded bg-gray-200 hover:bg-gray-300"
            >
              返回活動列表
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!event) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto p-4 pt-20">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">找不到活動</h1>
            <button
              onClick={() => router.push('/events')}
              className="px-6 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
            >
              瀏覽其他活動
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4 pt-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">{event.eventName} - 選擇門票</h1>
          
          {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />}
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">座位分配提示</h3>
              <p className="text-yellow-700">
                為確保訂票過程公平，所選區域內的座位將會由系統隨機分配。座位號碼將在付款完成後即時顯示。
              </p>
            </div>

            <table className="w-full mb-6">
              <tbody className="divide-y">
                <tr className="py-2">
                  <td className="py-3 font-semibold">演出時間</td>
                  <td className="py-3">
                    {event.eventDate ? new Date(event.eventDate).toLocaleString() : 'N/A'}
                  </td>
                </tr>
                <tr className="py-2">
                  <td className="py-3 font-semibold">演出地點</td>
                  <td className="py-3">{event.location}</td>
                </tr>
              </tbody>
            </table>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block mb-2 font-semibold">
                  選擇區域: 
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    (座位將隨機分配)
                  </span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  {event.zones?.map(zone => (
                    <button
                      key={zone.name}
                      type="button"
                      onClick={() => setSelectedZone(zone.name)}
                      disabled={zone.zoneQuantity === 0}
                      className={`
                        p-4 rounded-lg border-2 text-left transition-all
                        ${selectedZone === zone.name 
                          ? 'border-blue-500 bg-blue-50' 
                          : zone.zoneQuantity === 0
                            ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                            : 'border-gray-200 hover:border-blue-200'}
                      `}
                    >
                      <div className="font-semibold mb-1">{zone.name}區</div>
                      <div className="text-sm text-gray-600">
                        HKD {Number(zone.price).toLocaleString('en-HK')}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {zone.zoneQuantity === 0 
                          ? '已售罄' 
                          : `尚餘 ${zone.zoneQuantity} 張`}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-w-xs">
                <label className="block mb-2 font-semibold">數量:</label>
                <select 
                  value={quantity} 
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full p-2 border rounded"
                  required
                >
                  {[1, 2, 3, 4].map(num => {
                    const isDisabled = selectedZoneDetails ? selectedZoneDetails.zoneQuantity < num : false;
                    return (
                      <option key={num} value={num} disabled={isDisabled}>
                        {num} 張 {isDisabled ? '(票券不足)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedZone && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-3">訂單摘要</h3>
                  <table className="w-full">
                    <tbody className="divide-y">
                      <tr>
                        <td className="py-2">門票價格</td>
                        <td className="py-2 text-right">
                          HKD {ticketPrice.toLocaleString('en-HK')} × {quantity}
                        </td>
                        <td className="py-2 text-right">
                          HKD {subtotal.toLocaleString('en-HK')}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2">平台手續費</td>
                        <td className="py-2 text-right">
                          HKD {PLATFORM_FEE} × {quantity}
                        </td>
                        <td className="py-2 text-right">
                          HKD {platformFeeTotal.toLocaleString('en-HK')}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 font-bold">總計</td>
                        <td></td>
                        <td className="py-2 text-right font-bold">
                          HKD {totalPrice.toLocaleString('en-HK')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

                <div className="flex justify-between gap-4">
                  <button
                    type="button"
                    onClick={handleBackNavigation}
                    className="flex-1 px-6 py-2 rounded bg-gray-200 hover:bg-gray-300"
                  >
                    返回
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedZone || loading || isProcessing}
                    className="flex-1 px-6 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? '處理中...' : '前往付款'}
                  </button>
                </div>
              </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default BookingPage;