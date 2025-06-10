'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/navbar/Navbar';
import { useAuth } from '@/context/AuthContext';
import { Events } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import { useTranslations } from '@/hooks/useTranslations'; // Import useTranslations
import { formatDate as formatDateUtil } from '@/utils/formatters'; // Corrected import path

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
  const { t, locale } = useTranslations(); // Initialize useTranslations
  const [event, setEvent] = useState<Events | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Check if we're in a redirect loop
    const redirectAttempt = sessionStorage.getItem('redirectAttempt');
    
    // Check authentication first, but only if not in a redirect loop
    if (!authLoading && !isAuthenticated && !redirectAttempt) {
      // Store a flag to prevent redirect loops
      sessionStorage.setItem('redirectAttempt', 'true');
      
      // Store the current path for redirect after login
      const currentPath = `/events/${id}/booking`;
      
      // Add timestamp to prevent caching
      const timestamp = Date.now();
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}&t=${timestamp}`);
      return;
    }
    
    // If authenticated, clear the redirect flag
    if (isAuthenticated) {
      sessionStorage.removeItem('redirectAttempt');
    }

    const fetchEventDetails = async () => {
      try {
        setLoading(true);
        setError(null); // Reset error state
        
        // Check if id is valid
        if (!id) {
          setError(t('errorFetchingData')); // Use translated error
          setLoading(false);
          return;
        }

        const data = await getEventDetails(id as string);
        setEvent(data);

        // Prevent booking if event is in draw mode or has ended
        if (data.isDrawMode === true) {
          setError(t('errorFetchingData')); // Use translated error, or a more specific one like 'eventInDrawModeNotBookable'
          router.push(`/events/${id}/lottery`);
          return;
        }

        // Check if event date has passed
        if (data.eventDate && new Date(data.eventDate) < new Date()) {
          setError(t('errorFetchingData')); // Use translated error, or 'eventHasEnded'
          return;
        }

        // Set the default zone if available
        if (data.zones && data.zones.length > 0) {
          setSelectedZone(data.zones[0].name);
        }
      } catch (err) {
        console.error('Error fetching event details:', err);
        setError(err instanceof Error ? err.message : t('errorFetchingData')); // Use translated error
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchEventDetails();
    }
  }, [id, router, isAuthenticated, authLoading, t]); // Added t to dependency array

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isProcessing || !selectedZone) return;
    
    try {
      setIsProcessing(true);
      setError(null);
      
      // Store event info in sessionStorage
      sessionStorage.setItem('bookingEventInfo', JSON.stringify({
        eventId: id,
        eventName: event?.eventName,
        eventLocation: event?.location,
        eventDate: event?.eventDate
      }));
      
      // Create booking
      const sessionId = crypto.randomUUID();
      const payload = {
        eventId: id,
        userId: user?.userId,
        zone: selectedZone,
        quantity,
        sessionId
      };
      
      const res = await fetch(`/api/bookings/create-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
          'x-user-id': user?.userId || ''
        },
        credentials: 'omit',
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        throw new Error('Booking creation failed');
      }
      
      const data = await res.json();
      router.push(`/events/${id}/payment?bookingToken=${data.bookingToken}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorProcessingPayment')); // Use translated error
    } finally {
      setIsProcessing(false);
    }
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

  const formatDate = (dateString: string) => {
    return formatDateUtil(dateString, 'Pp', { locale });
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

  if (error && !event) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto p-4 pt-20">
          <Alert type="error" title={t('error')} message={error} /> {/* Ensure 'error' key exists */}
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => router.push('/events')}
              className="px-6 py-2 rounded bg-gray-200 hover:bg-gray-300"
            >
              {t('backToList')}
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
            <h1 className="text-2xl font-bold mb-6">{t('pageNotFound')}</h1>
            <button
              onClick={() => router.push('/events')}
              className="px-6 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
            >
              {t('browseOtherEvents')}
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
          <h1 className="text-2xl font-bold mb-6">{t('selectTicketsFor', { eventName: event.eventName })}</h1>
          
          {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />}
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">{t('seatAllocationTip')}</h3>
              <p className="text-yellow-700">
                {t('seatAllocationMessage')}
              </p>
            </div>
            <table className="w-full mb-6">
              <tbody className="divide-y">
                <tr className="py-2">
                  <td className="py-3 font-semibold">{t('performanceTime')}</td>
                  <td className="py-3">
                    {event.eventDate ? formatDate(event.eventDate) : 'N/A'}
                  </td>
                </tr>
                <tr className="py-2">
                  <td className="py-3 font-semibold">{t('performanceLocation')}</td>
                  <td className="py-3">{event.location}</td>
                </tr>
              </tbody>
            </table>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block mb-2 font-semibold">
                  {t('selectZone')}
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    {t('seatsRandomlyAssigned')}
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
                      <div className="font-semibold mb-1">{t('zoneNameWithSuffix', { zoneName: zone.name })}</div>
                      <div className="text-sm text-gray-600">
                        HKD {Number(zone.price).toLocaleString('en-HK')}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {zone.zoneQuantity === 0 
                          ? t('soldOut')
                          : t('ticketsRemaining', { count: zone.zoneQuantity })}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-w-xs">
                <label className="block mb-2 font-semibold">{t('quantity')}:</label>
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
                        {num} {t('ticketsUnit')} {isDisabled ? t('ticketInsufficient') : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedZone && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-3">{t('orderSummary')}</h3>
                  <table className="w-full">
                    <tbody className="divide-y">
                      <tr>
                        <td className="py-2">{t('ticketPrice')}</td>
                        <td className="py-2 text-right">
                          HKD {ticketPrice.toLocaleString('en-HK')} × {quantity}
                        </td>
                        <td className="py-2 text-right">
                          HKD {subtotal.toLocaleString('en-HK')}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2">{t('platformFeeLabel')}</td>
                        <td className="py-2 text-right">
                          HKD {PLATFORM_FEE} × {quantity}
                        </td>
                        <td className="py-2 text-right">
                          HKD {platformFeeTotal.toLocaleString('en-HK')}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 font-bold">{t('total')}</td>
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
                  {t('back')}
                </button>
                <button
                  type="submit"
                  disabled={!selectedZone || loading || isProcessing}
                  className="flex-1 px-6 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  {isProcessing ? t('processing') : t('proceedToPayment')}
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