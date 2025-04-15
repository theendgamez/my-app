'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navbar/Navbar';
import { useAuth } from '@/context/AuthContext';
import { Alert } from '@/components/ui/Alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Booking, Events } from '@/types';
import { fetchWithAuth } from '@/utils/fetchWithAuth';

interface BookingWithEvent extends Booking {
  event?: Events;
  price?: number;
  totalAmount?: number;
  paymentId?: string;
}

export default function CartPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<BookingWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Verify user is authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent("/user/cart")}`);
      return;
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch user's bookings
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetchWithAuth(`/api/bookings/user/${user.userId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch bookings');
        }

        const data = await response.json();
        
        // Fetch event details for each booking
        const bookingsWithEvents = await Promise.all(
          data.map(async (booking: BookingWithEvent) => {
            try {
              const eventResponse = await fetchWithAuth(`/api/events/${booking.eventId}`);
              if (eventResponse.ok) {
                const event = await eventResponse.json();
                const zone = event.zones?.find((z: { name: string; price: string | number }) => z.name === booking.zone);
                return {
                  ...booking,
                  event,
                  price: zone ? Number(zone.price) : 0,
                  totalAmount: zone ? (Number(zone.price) * booking.quantity) + (18 * booking.quantity) : 0
                };
              }
              return booking;
            } catch (error) {
              console.error('Error fetching event:', error);
              return booking;
            }
          })
        );
        const pendingBookings = bookingsWithEvents.filter((booking) => booking.status === 'pending');
        setBookings(pendingBookings);
      } catch (error) {
        console.error('Error fetching bookings:', error);
        setError(error instanceof Error ? error.message : '載入訂單時發生錯誤');
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [isAuthenticated, user]);

  const proceedToPayment = (booking: BookingWithEvent) => {
    router.push(`/events/${booking.eventId}/payment?bookingToken=${booking.bookingToken}`);
  };

  const cancelBooking = async (bookingToken: string) => {
    if (actionInProgress) return;
    
    if (!confirm('確定要取消此訂單嗎？此操作無法撤銷。')) {
      return;
    }

    try {
      setActionInProgress(bookingToken);
      const response = await fetchWithAuth(`/api/bookings/${bookingToken}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ userId: user?.userId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '取消訂單失敗');
      }

      // Remove cancelled booking from the list
      setBookings(bookings.filter(b => b.bookingToken !== bookingToken));
    } catch (error) {
      console.error('Error cancelling booking:', error);
      setError(error instanceof Error ? error.message : '取消訂單時發生錯誤');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleNavigate = (e: React.MouseEvent<HTMLButtonElement>, path: string) => {
    e.preventDefault(); // Prevent any default behavior
    router.push(path);
  };

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

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4 pt-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">待付款訂單</h1>
          
          {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />}
          
          {bookings.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <p className="text-gray-600 mb-4">您沒有待付款的訂單</p>
              <button
                onClick={(e) => handleNavigate(e, '/events')}
                className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                瀏覽活動
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div 
                  key={booking.bookingToken} 
                  className="bg-white p-6 rounded-lg shadow-md"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-semibold">
                        {booking.event?.eventName || '未知活動'}
                      </h2>
                      <p className="text-gray-600">
                        {booking.event?.eventDate 
                          ? new Date(booking.event.eventDate).toLocaleString() 
                          : '日期未知'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                        待付款
                      </span>
                    </div>
                  </div>
                  
                  <div className="border-t border-b py-3 mb-4">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <span className="text-gray-600">區域:</span>
                      <span className="text-right">{booking.zone}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <span className="text-gray-600">數量:</span>
                      <span className="text-right">{booking.quantity} 張</span>
                    </div>
                    {booking.price && (
                      <>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <span className="text-gray-600">票價:</span>
                          <span className="text-right">HKD {booking.price.toLocaleString('en-HK')} × {booking.quantity}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <span className="text-gray-600">平台服務費:</span>
                          <span className="text-right">HKD 18 × {booking.quantity}</span>
                        </div>
                      </>
                    )}
                    {booking.totalAmount && (
                      <div className="grid grid-cols-2 gap-2 font-bold pt-2 border-t">
                        <span>總金額:</span>
                        <span className="text-right">HKD {booking.totalAmount.toLocaleString('en-HK')}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        cancelBooking(booking.bookingToken);
                      }}
                      disabled={actionInProgress === booking.bookingToken}
                      className="px-4 py-2 border border-red-500 text-red-500 rounded hover:bg-red-50 disabled:opacity-50"
                    >
                      {actionInProgress === booking.bookingToken ? '處理中...' : '取消訂單'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        proceedToPayment(booking);
                      }}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      前往付款
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}