'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navbar/Navbar';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Booking, Events } from '@/types';
import { formatDate } from '@/utils/formatters'; // Import the new formatter
import { useTranslations } from '@/hooks/useTranslations'; // Import useTranslations

// Define user interface to match the localStorage structure
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
  const { t } = useTranslations(); // Initialize useTranslations

  // Memoize fetchBookings with useCallback
  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Safe localStorage access
      const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

      // Fetch bookings using user ID with proper authorization
      const response = await fetch(`/api/bookings/user/${user?.userId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
          'x-user-id': user?.userId || ''
        },
        credentials: 'include' // Changed to 'include' for consistency
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push(`/login?redirect=${encodeURIComponent('/user/cart')}`);
          return;
        }
        throw new Error(t('cartErrorFetchBookings'));
      }

      const data = await response.json();

      // Fetch event details for each booking
      const bookingsWithEvents = await Promise.all(
        data.map(async (booking: BookingWithEvent) => {
          try {
            const eventResponse = await fetch(`/api/events/${booking.eventId}`, {
              headers: {
                'Content-Type': 'application/json',
                ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
                'x-user-id': user?.userId || ''
              },
              credentials: 'include' // Changed to 'include' for consistency
            });

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
      setError(error instanceof Error ? error.message : t('cartErrorLoadingOrders'));
    } finally {
      setLoading(false);
    }
  }, [user, router, t]);

  useEffect(() => {
    // Check authentication first
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent('/user/cart')}`);
      return;
    }

    // Only fetch bookings if user is authenticated
    if (!authLoading && isAuthenticated && user) {
      fetchBookings();
    }
  }, [isAuthenticated, authLoading, user, router, fetchBookings]);

  const handleNavigate = (e: React.MouseEvent<HTMLButtonElement>, path: string) => {
    e.preventDefault(); // Prevent any default behavior
    router.push(path);
  };

  const proceedToPayment = (booking: BookingWithEvent) => {
    router.push(`/events/${booking.eventId}/payment?bookingToken=${booking.bookingToken}`);
  };

  const cancelBooking = async (bookingToken: string) => {
    try {
      // Retrieve accessToken from localStorage
      const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

      const response = await fetch(`/api/bookings/${bookingToken}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
          'x-user-id': user?.userId || ''
        },
        body: JSON.stringify({ userId: user?.userId })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('cartErrorCancelOrderFailed'));
      }

      // Remove cancelled booking from the list
      setBookings(bookings.filter(b => b.bookingToken !== bookingToken));
    } catch (error) {
      console.error('Error cancelling booking:', error);
      setError(error instanceof Error ? error.message : t('cartErrorCancellingOrderGeneral'));
    } finally {
      setActionInProgress(null);
    }
  };

  if (authLoading) {
    return (
      <>
        <Navbar />
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner size="large" />
        </div>
      </>
    );
  }

  if (loading) {
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
          <h1 className="text-2xl font-bold mb-6">{t('cartPageTitle')}</h1>

          {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />}

          {bookings.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <p className="text-gray-600 mb-4">{t('cartNoPendingOrders')}</p>
              <button
                onClick={(e) => handleNavigate(e, '/events')}
                className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                {t('browseEvents')}
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
                        {booking.event?.eventName || t('unknownEvent')}
                      </h2>
                      <p className="text-gray-600">
                        {booking.event?.eventDate
                          ? formatDate(booking.event.eventDate) // Use new formatter
                          : t('cartUnknownDate')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                        {t('needPayment')}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-b py-3 mb-4">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <span className="text-gray-600">{t('cartZoneLabel')}</span>
                      <span className="text-right">{booking.zone}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <span className="text-gray-600">{t('cartQuantityLabel')}</span>
                      <span className="text-right">{booking.quantity} {t('ticketsUnit')}</span>
                    </div>
                    {booking.price && (
                      <>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <span className="text-gray-600">{t('ticketPrice')}</span>
                          <span className="text-right">HKD {booking.price.toLocaleString('en-HK')} × {booking.quantity}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <span className="text-gray-600">{t('platformFeeLabel')}</span>
                          <span className="text-right">HKD 18 × {booking.quantity}</span>
                        </div>
                      </>
                    )}
                    {booking.totalAmount && (
                      <div className="grid grid-cols-2 gap-2 font-bold pt-2 border-t">
                        <span>{t('total')}</span>
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
                      {actionInProgress === booking.bookingToken ? t('processing') : t('cartCancelOrder')}
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        proceedToPayment(booking);
                      }}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      {t('proceedToPayment')}
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