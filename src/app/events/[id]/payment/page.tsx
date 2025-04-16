'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import Navbar from '@/components/navbar/Navbar';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import CreditCardForm from '@/components/ui/CreditCardForm';
import { BookingDetails, ProcessedPayment } from '@/types';
import { fetchWithAuth } from '@/utils/fetchWithAuth';

// 10-minute countdown timer component
//change timer in api/bookings/create-intent/route.ts 
const CountdownTimer = ({ expiresAt }: { expiresAt: number }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const router = useRouter();

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = expiresAt - Date.now();
      const newTimeLeft = Math.max(0, Math.floor(difference / 1000));
      setTimeLeft(newTimeLeft);
      
      // If time has expired, redirect to home page
      if (newTimeLeft === 0) {
        // Show alert and then redirect
          alert('預留時間已結束，請重新選擇座位。');
          router.push('/');
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, router]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className={`text-sm font-medium ${timeLeft < 60 ? 'text-red-600' : 'text-gray-600'}`}>
      預留時間: {minutes}:{seconds.toString().padStart(2, '0')}
    </div>
  );
};

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id: eventId } = useParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  
  const bookingToken = searchParams.get('bookingToken');

  useEffect(() => {
    // Check authentication first
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(`/events/${eventId}`)}`);
      return;
    }

    // Validate booking token
    if (!bookingToken) {
      setError('Missing booking information');
      setLoading(false);
      return;
    }

    const fetchBookingDetails = async () => {
      try {
        const res = await fetchWithAuth(`/api/bookings/${bookingToken}/verify`);
        if (!res.ok) {
          throw new Error(await res.text() || 'Failed to verify booking');
        }

        const data = await res.json();
        setBookingDetails(data);
      } catch (err) {
        console.error('Error fetching booking details:', err);
        setError(err instanceof Error ? err.message : 'Unable to retrieve booking information');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && bookingToken) {
      fetchBookingDetails();
    }
  }, [bookingToken, isAuthenticated, authLoading, router, eventId]);

  const handlePayment = async (cardData: {
    cardNumber: string;
    expiryDate: string;
    cvc: string;
    cardholderName: string;
  }) => {
    if (!bookingDetails || !user) return;
    
    setProcessing(true);
    setError(null);

    try {
      // Validate that the booking hasn't expired
      if (bookingDetails.expiresAt < Date.now()) {
        throw new Error('您的預訂已過期，請重新選擇座位');
      }

      const response = await fetchWithAuth('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.userId, // Add userId to the request body
          bookingToken,
          cardDetails: {
            // Only send last 4 digits for security
            lastFourDigits: cardData.cardNumber.slice(-4),
          }
        }),
      });

      if (!response.ok) {
        let errorMessage = `Payment failed with status: ${response.status}`;
        let errorData: { message: string; error?: string; code?: string } = { message: errorMessage };
        
        try {
          // Safely try to parse the error response as JSON
          const jsonData = await response.json();
          errorData = jsonData || errorData;
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
          // Use the status text if JSON parsing fails
          errorMessage = `Payment failed: ${response.statusText || 'Unknown error'}`;
        }
        
        console.error('Payment processing error:', errorData);
        
        // Handle authentication errors specifically
        if (errorData.code === 'UNAUTHORIZED') {
          setError('Your session has expired. Please log in again.');
          router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        
        // Set a user-friendly error message
        setError(errorMessage);
        setProcessing(false);
        return;
      }

      const payment: ProcessedPayment = await response.json();
      router.push(`/events/${eventId}/success?paymentId=${payment.paymentId}`);
    } catch (err) {
      console.error('Payment submission error:', err);
      setError(err instanceof Error ? err.message : '付款處理過程中發生錯誤');
      setProcessing(false);
    }
  };

  const formatEventDate = (dateString?: string) => {
    if (!dateString) return '未指定';
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', dateString);
        return '日期格式有誤';
      }
      
      return date.toLocaleString('zh-HK', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (err) {
      console.error('Error formatting date:', err);
      return '日期格式有誤';
    }
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

  if (error || !bookingDetails) {
    return (
      <>
        <Navbar />
        <div className="flex justify-center itemscenter min-h-screen bg-gray-100">
          <div className="w-full max-w-md p-8 bg-white rounded shadow">
            <h1 className="text-2xl font-bold mb-4">付款錯誤</h1>
            <Alert type="error" message={error || '無效的預訂資訊'} />
            <button
              onClick={() => router.push(`/events/${eventId}`)}
              className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
            >
              返回活動頁面
            </button>
          </div>
        </div>
      </>
    );
  }

  const totalPrice = bookingDetails.price * bookingDetails.quantity;
  const platformFeeTotal = 18 * bookingDetails.quantity;
  const grandTotal = totalPrice + platformFeeTotal;

  return (
    <>
      <Navbar />
      <div className="flex justify-center items-center min-h-screen bg-gray-100 mt-16">
        <div className="w-full max-w-md p-8 bg-white rounded shadow">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">信用卡付款</h1>
          </div>
          
          {error && (
            <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />
          )}
          
          <div className="mb-6">

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
              {/* Timer is now inside the order details card */}
              {bookingDetails.expiresAt && (
                <div className="mb-2">
                  <CountdownTimer expiresAt={bookingDetails.expiresAt} />
                </div>
              )}
              <h2 className="font-semibold text-blue-800 mb-2">訂單詳情</h2>
              <div className="text-blue-700">
                <div className="flex justify-between mb-1">
                  <span>活動名稱:</span>
                  <span>{bookingDetails.eventName}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>場次時間:</span>
                  <span>{formatEventDate(bookingDetails.eventDate)}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>場地:</span>
                  <span>{bookingDetails.eventLocation}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>區域:</span>
                  <span>{bookingDetails.zone}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>數量:</span>
                  <span>{bookingDetails.quantity} 張</span>
                </div>
              </div>
            </div>
            
            <div className="border-t border-b py-3 mb-4">
              <div className="flex justify-between mb-1">
                <span>票價:</span>
                <span>HKD {(bookingDetails?.price ?? 0).toLocaleString('en-HK')} × {bookingDetails.quantity}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>平台服務費:</span>
                <span>HKD 18 × {bookingDetails.quantity}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>總計:</span>
                <span>HKD {grandTotal.toLocaleString('en-HK')}</span>
              </div>
            </div>
          </div>

          <CreditCardForm onSubmit={handlePayment} isProcessing={processing} />
          
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => router.push(`/events/${eventId}/booking`)}
              className="text-gray-600 hover:text-gray-800 underline"
            >
              返回選擇頁面
            </button>
          </div>
        </div>
      </div>
    </>
  );
}