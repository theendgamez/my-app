'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/navbar/Navbar';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import CreditCardForm from '@/components/ui/CreditCardForm';
import Link from 'next/link';

// Define types needed for this page
type EventDetails = {
  eventId: string;
  eventName: string;
  eventDate: string;
  location: string;
  zones: Zone[];
};

type Zone = {
  name: string;
  price: number;
  zoneQuantity: number;
};

type Registration = {
  registrationToken: string;
  eventId: string;
  eventName: string;
  zoneName: string;
  quantity: number;
  status: string;
};

type ZoneDetails = {
  name: string;
  price?: number;
};

const PLATFORM_FEE = 18; // Platform fee per ticket in HKD

export default function LotteryTicketPurchasePage() {
  const router = useRouter();
  const { id } = useParams();
  const searchParams = useSearchParams();
  const registrationToken = searchParams.get('registrationToken');
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [zoneDetails, setZoneDetails] = useState<ZoneDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Check authentication first
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    if (!registrationToken) {
      setError('缺少抽籤登記令牌');
      setLoading(false);
      return;
    }
    
    // Fetch lottery registration and event details
    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log(`Fetching details for registration token: ${registrationToken}`);
        
        const accessToken = localStorage.getItem('accessToken') || '';
        const response = await fetch(`/api/lottery/registration/${registrationToken}/details`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-user-id': user?.userId || ''
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '無法獲取抽籤登記詳情');
        }

        const data = await response.json();
        console.log("API response data:", data); // Debug log to check data structure
        
        // Extract registration and event data
        const registrationData = data.registration || {};
        const eventData = data.event || {};
        const zoneDetailsData = data.zoneDetails || {};
        
        // Check if user has won the lottery
        if (registrationData.status !== 'won') {
          setError('您尚未在此抽籤中獲勝，無法購買門票');
          setTimeout(() => {
            router.push('/user/lottery');
          }, 2000);
          return;
        }
        
        // More precise check for ticket purchase status
        // Check both direct flag and presence of tickets
        const hasTickets = Boolean(registrationData.ticketsPurchased || 
                                 (registrationData.ticketIds && 
                                  registrationData.ticketIds.length > 0 && 
                                  registrationData.paymentId));
        
        console.log("Ticket purchase status check:", { 
          ticketsPurchased: registrationData.ticketsPurchased,
          hasTicketIds: Boolean(registrationData.ticketIds && registrationData.ticketIds.length > 0),
          hasPaymentId: Boolean(registrationData.paymentId),
          finalResult: hasTickets
        });
        
        // Check if tickets have already been purchased
        if (hasTickets) {
          setError('您已經購買了此活動的門票');
          setTimeout(() => {
            router.push('/user/order');
          }, 2000);
          return;
        }
        
        setRegistration({
          registrationToken: registrationData.registrationToken,
          eventId: registrationData.eventId || eventData.eventId,
          eventName: eventData.eventName || '未知活動',
          zoneName: registrationData.zoneName,
          quantity: registrationData.quantity || 1,
          status: registrationData.status
        });
        
        setEvent({
          eventId: eventData.eventId,
          eventName: eventData.eventName,
          eventDate: eventData.eventDate,
          location: eventData.location,
          zones: eventData.zones || []
        });
        
        // Set zone details separately - this is important for ticket price
        setZoneDetails(zoneDetailsData);
        
        // Log zones information to debug
        console.log("Zones information:", eventData.zones);
        console.log("Selected zone:", registrationData.zoneName);
        console.log("Zone details from API:", zoneDetailsData);
      } catch (err) {
        console.error('Error fetching details:', err);
        setError(err instanceof Error ? err.message : '無法獲取抽籤登記詳情');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && registrationToken) {
      fetchDetails();
    }
  }, [id, registrationToken, isAuthenticated, authLoading, router, user]);

  const handlePayment = async (cardData: {
    cardNumber: string;
    expiryDate: string;
    cvc: string;
    cardholderName: string;
  }) => {
    if (!registration || !event || !user) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Get price information for the selected zone
      const selectedZone = event.zones.find(zone => zone.name === registration.zoneName);
      let ticketPrice = 0;
      if (selectedZone) {
        ticketPrice = Number(selectedZone.price);
      } else if (zoneDetails && zoneDetails.price) {
        ticketPrice = Number(zoneDetails.price);
      } else {
        ticketPrice = 100; // Fallback price
      }

      const platformFeeTotal = PLATFORM_FEE * registration.quantity;
      const subtotal = ticketPrice * registration.quantity;
      const totalAmount = subtotal + platformFeeTotal;

      // Send payment request
      const response = await fetch('/api/lottery/tickets/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
          'x-user-id': user.userId || ''
        },
        body: JSON.stringify({
          registrationToken,
          paymentMethod: 'credit_card',
          cardDetails: {
            // Only send last 4 digits for security
            lastFourDigits: cardData.cardNumber.slice(-4),
          },
          totalAmount,
          quantity: registration.quantity
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '支付處理時出錯');
      }

      setSuccess('門票購買成功！您將收到確認電子郵件。');
      
      // Redirect to tickets page after a short delay
      setTimeout(() => {
        router.push('/user/order');
      }, 2000);
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : '支付處理時出錯');
    } finally {
      setIsProcessing(false);
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

  if (error && (!registration || !event)) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto p-4 pt-20">
          <Alert type="error" title="錯誤" message={error} />
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => router.back()}
              className="px-6 py-2 rounded bg-gray-200 hover:bg-gray-300"
            >
              返回
            </button>
          </div>
        </div>
      </>
    );
  }

  // Calculate prices - modified to use zoneDetails if zones are empty
  const selectedZone = event?.zones.find(zone => zone.name === registration?.zoneName);
  
  // Use price from multiple possible sources, with fallbacks
  let ticketPrice = 0;
  if (selectedZone) {
    // Option 1: Found in event zones
    ticketPrice = Number(selectedZone.price);
  } else if (zoneDetails && zoneDetails.price) {
    // Option 2: Found in separate zoneDetails
    ticketPrice = Number(zoneDetails.price);
  } else if (event?.zones && event.zones.length > 0) {
    // Option 3: Calculate from other zones in the event
    const availablePrices = event.zones
      .filter(zone => zone.price && !isNaN(Number(zone.price)))
      .map(zone => Number(zone.price));
    
    if (availablePrices.length > 0) {
      // Use average price from other zones
      ticketPrice = Math.round(availablePrices.reduce((sum, price) => sum + price, 0) / availablePrices.length);
    }
  }
  
  // Ensure we have at least some price value
  if (ticketPrice <= 0) {
    console.warn("Could not determine ticket price from data, setting default");
    ticketPrice = 100; // Last resort fallback with clear indication this is wrong
  }
  
  const totalAmount = ticketPrice * (registration?.quantity || 0);
  
  // Debug info to console to see what's happening
  console.log("Event zones:", event?.zones);
  console.log("Looking for zone name:", registration?.zoneName);
  console.log("Selected zone found:", selectedZone);
  console.log("Zone details:", zoneDetails);
  console.log("Using ticket price:", ticketPrice);

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4 pt-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">購買門票</h1>
          
          {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />}
          {success && <Alert type="success" message={success} className="mb-4" />}
          
          {registration && event && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">{event.eventName}</h2>
              
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="mb-2">
                  <span className="font-semibold">恭喜！</span> 您已中籤，現在可以購買本次活動的門票。
                </p>
                <p>請在48小時內完成付款，否則將視為放棄資格。</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold mb-4">活動詳情</h3>
                  <table className="w-full text-sm">
                    <tbody className="divide-y">
                      <tr>
                        <td className="py-2 font-medium">活動日期</td>
                        <td className="py-2">
                          {event.eventDate ? new Date(event.eventDate).toLocaleString() : '未指定'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 font-medium">活動地點</td>
                        <td className="py-2">{event.location || '未指定'}</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-medium">選擇區域</td>
                        <td className="py-2">{registration.zoneName}區</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-medium">數量</td>
                        <td className="py-2">{registration.quantity} 張</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-4">費用詳情</h3>
                  <table className="w-full text-sm">
                    <tbody className="divide-y">
                      <tr>
                        <td className="py-2">票價</td>
                        <td className="py-2 text-right">
                          HKD {ticketPrice.toLocaleString('en-HK')} × {registration.quantity}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 font-semibold">總計</td>
                        <td className="py-2 text-right font-semibold">
                          HKD {totalAmount.toLocaleString('en-HK')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">付款方式</h3>
                <CreditCardForm onSubmit={handlePayment} isProcessing={isProcessing} />
              </div>
            </div>
          )}
          
          <div className="mt-6 flex justify-center">
            <Link 
              href="/user/lottery" 
              className="px-6 py-2 rounded bg-gray-200 hover:bg-gray-300"
            >
              返回抽籤列表
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
