'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import Navbar from '@/components/navbar/Navbar';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import CreditCardForm from '@/components/ui/CreditCardForm';
import { BookingDetails} from '@/types';
import { fetchWithAuth } from '@/utils/fetchWithAuth';

// 10-minute countdown timer component
const CountdownTimer = ({ expiresAt }: { expiresAt: number }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const router = useRouter();

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = expiresAt - Date.now();
      const newTimeLeft = Math.max(0, Math.floor(difference / 1000));
      setTimeLeft(newTimeLeft);
      
      // Redirect if time expires
      if (newTimeLeft <= 0) {
        router.push('/events');
      }
    };
    
    // Initial calculation
    calculateTimeLeft();
    
    // Set up interval to update countdown
    const timerId = setInterval(calculateTimeLeft, 1000);
    
    // Cleanup function
    return () => clearInterval(timerId);
  }, [expiresAt, router]);
  
  // Format time for display
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  return (
    <div className="text-center">
      <p className="text-lg font-medium">支付倒計時</p>
      <div className="text-2xl font-bold text-red-600">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>
      <p className="text-sm text-gray-500">超時未付款將自動取消預訂</p>
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
  const [paymentExpiresAt, setPaymentExpiresAt] = useState<number | null>(null);

  useEffect(() => {
    // Skip if still loading auth state
    if (authLoading) return;

    // Check for authentication
    if (!isAuthenticated) {
      // Redirect to login with return URL
      const currentPath = window.location.pathname + window.location.search;
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }
    
    // Get booking details from query parameter
    const bookingToken = searchParams.get('bookingToken');
    const registrationToken = searchParams.get('registrationToken');
    
    if (!bookingToken && !registrationToken) {
      // No tokens provided, redirect to events page
      setError('未提供預訂代碼，無法進行付款');
      setTimeout(() => {
        router.push('/events');
      }, 3000);
      return;
    }

    // Fetch the booking details to validate
    const fetchDetails = async () => {
      try {
        setLoading(true);
        let endpoint;
        
        if (bookingToken) {
          endpoint = `/api/bookings/${bookingToken}`;
        } else if (registrationToken) {
          endpoint = `/api/lottery/registration/${registrationToken}`;
        } else {
          throw new Error('無法識別付款類型');
        }

        const responseUnknown = await fetchWithAuth(endpoint);
        const response = responseUnknown as BookingDetails & { status?: string; event?: { drawDate?: string } };
        
        // Check if token is valid and booking/registration is still active
        if (response.status === 'expired' || response.status === 'cancelled') {
          setError('此訂單已過期或已取消');
          setTimeout(() => router.push('/events'), 3000);
          return;
        }

        // For lottery registrations, check if the registration period is still open
        if (registrationToken && response.event) {
          // Check if the drawing date has passed
          if (response.event.drawDate) {
            const drawDate = new Date(response.event.drawDate);
            if (drawDate < new Date()) {
              setError('抽籤登記已結束，無法進行付款');
              setTimeout(() => router.push('/events'), 3000);
              return;
            }
          } else {
            setError('抽籤登記日期無效，無法進行付款');
            setTimeout(() => router.push('/events'), 3000);
            return;
          }
        }
        
        // All validations passed, set the booking details
        setBookingDetails(response);
        
        // Calculate payment expiry time
        if (response.expiresAt) {
          setPaymentExpiresAt(response.expiresAt);
        } else {
          // Default to 10 minutes if no expiration set
          setPaymentExpiresAt(Date.now() + 10 * 60 * 1000);
        }
      } catch (err) {
        console.error('Error fetching booking details:', err);
        setError(err instanceof Error ? err.message : '獲取訂單詳情時出錯');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [isAuthenticated, authLoading, router, searchParams, eventId]);

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
        setProcessing(false);
        throw new Error('您的預訂已過期，請重新選擇座位');
      }

      // Use fetch directly instead of fetchWithAuth helper to have more control over error handling
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
          'x-user-id': user.userId
        },
        body: JSON.stringify({
          bookingToken: searchParams.get('bookingToken'),
          cardDetails: {
            // Only send last 4 digits for security
            lastFourDigits: cardData.cardNumber.slice(-4),
          }
        }),
      });

      // Handle HTTP errors
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Payment failed with status: ${response.status}`;
        
        try {
          // Try to parse as JSON, but don't fail if it's not valid JSON
          const errorData = JSON.parse(errorText);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // If parsing fails, use the raw text if available
          if (errorText) {
            errorMessage = errorText;
          }
        }
        
        throw new Error(errorMessage);
      }
      
      // Parse the successful response
      const data = await response.json();
      
      // If successful, redirect to success page
      router.push(`/events/${eventId}/success?paymentId=${data.paymentId}`);
    } catch (err) {
      console.error('Payment processing error:', err);
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
              {paymentExpiresAt && (
                <div className="mb-2">
                  <CountdownTimer expiresAt={paymentExpiresAt} />
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