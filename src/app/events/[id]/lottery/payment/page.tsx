"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/navbar/Navbar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import CreditCardForm from '@/components/ui/CreditCardForm';
import { Registration } from '@/types';

const PLATFORM_FEE = 18; // Platform fee per ticket in HKD

// Add proper type for card data
interface CardData {
  cardNumber: string;
  expiryDate: string;
  cvc: string;
  cardholderName: string;
}

function LotteryPaymentPage() {
  const router = useRouter();
  const { id } = useParams();
  const searchParams = useSearchParams();
  const ticketId = searchParams.get('ticketId');
  const registrationToken = searchParams.get('registrationToken');
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<'platform_fee' | 'ticket_price'>('platform_fee');
  const [ticketPrice, setTicketPrice] = useState<number>(0);
  const [resolvedToken, setResolvedToken] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(true); // Control payment form visibility

  useEffect(() => {
    // Check authentication first
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    // Helper function to resolve registration token from ticket ID
    const resolveRegistrationToken = async (tokenOrTicketId: string): Promise<string | null> => {
      try {
        const accessToken = localStorage.getItem('accessToken') || '';
        
        // First try to use it directly as a registration token
        const directResponse = await fetch(`/api/lottery/registration/${tokenOrTicketId}/details`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-user-id': user?.userId || ''
          }
        });

        if (directResponse.ok) {
          console.log("Successfully resolved token directly:", tokenOrTicketId);
          return tokenOrTicketId; // It's already a registration token
        }

        // If that fails, try to find the registration token from ticket ID
        console.log(`Direct lookup failed, trying to resolve ticket ID: ${tokenOrTicketId}`);
        
        const ticketResponse = await fetch(`/api/lottery/tickets/${tokenOrTicketId}/registration`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-user-id': user?.userId || ''
          }
        });

        if (ticketResponse.ok) {
          const ticketData = await ticketResponse.json();
          console.log("Obtained registration token from ticket:", ticketData.registrationToken);
          return ticketData.registrationToken;
        } else {
          console.error("Failed to get registration from ticket API:", await ticketResponse.text());
        }

        // Final fallback: search through user's registrations
        console.log("Attempting fallback: checking user registrations");
        const userRegistrationsResponse = await fetch(`/api/registrations/lottery`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-user-id': user?.userId || ''
          }
        });

        if (userRegistrationsResponse.ok) {
          const userRegsData = await userRegistrationsResponse.json();
          const registrations = userRegsData.registrations || [];
          console.log(`Found ${registrations.length} user registrations, searching for matching ticket`);
          
          // Look for a registration that has this ticket ID
          for (const reg of registrations) {
            if (reg.ticketIds && reg.ticketIds.includes(tokenOrTicketId)) {
              console.log("Found matching registration:", reg.registrationToken);
              return reg.registrationToken;
            }
          }
        }

        console.error("All attempts to resolve registration token failed");
        return null;
      } catch (error) {
        console.error('Error resolving registration token:', error);
        return null;
      }
    };

    // Fetch lottery registration and event details
    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      setSuccess(null); // Reset success message
      setShowPaymentForm(false); // Default to not showing form until explicitly allowed

      try {
        let token = registrationToken;
        
        if (!token && ticketId) {
          console.log(`Resolving token from ticketId: ${ticketId}`);
          token = await resolveRegistrationToken(ticketId);
          if (token) {
            setResolvedToken(token);
            console.log(`Successfully resolved token: ${token}`);
          }
        }

        if (!token) {
          setError('缺少抽籤登記令牌，無法處理付款');
          setLoading(false);
          return;
        }

        console.log(`Fetching registration details for token: ${token}`);
        const response = await fetch(`/api/lottery/registration/${token}/details`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
            'x-user-id': user?.userId || ''
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`API error (${response.status}):`, errorText);
          throw new Error(`無法獲取登記詳情: ${response.status}`);
        }

        const data = await response.json();
        console.log("Registration API response:", data);
        
        const registrationData = data.registration; // Assuming API returns { registration: {...} }
        
        if (!registrationData || typeof registrationData.ticketsPurchased === 'undefined' || typeof registrationData.platformFeePaid === 'undefined' || !registrationData.status) {
          console.error("Invalid or incomplete registration data from API:", registrationData);
          setError('無法獲取有效的登記資料。');
          setLoading(false);
          return;
        }
        
        setRegistration(registrationData);
        
        // Determine payment type and form visibility
        if (registrationData.ticketsPurchased) {
          console.log("Tickets already purchased.");
          setSuccess('您已成功購買此活動的門票。'); 
          setError(null); 
          setShowPaymentForm(false); // Ensure form is hidden
        } else if (registrationData.platformFeePaid) {
          console.log("Platform fee is already paid.");
          if (registrationData.status === 'won') {
            console.log("Status is 'won'. Setting payment type to ticket_price.");
            setPaymentType('ticket_price');
            setShowPaymentForm(true); // Allow ticket payment
          } else {
            // Platform fee paid, but not 'won' (e.g., 'registered', 'lost')
            console.log(`Status is '${registrationData.status}'. No further payment needed at this time.`);
            setError('平台費用已支付。請等候抽籤結果或檢查您的票券狀態。');
            // setShowPaymentForm remains false
          }
        } else { 
          // Platform fee is NOT paid
          console.log("Platform fee is not paid.");
          // Allow platform fee payment if status is 'registered' (pre-draw) or 'won' (somehow fee missed)
          if (registrationData.status === 'registered' || registrationData.status === 'won') {
            console.log(`Status is '${registrationData.status}'. Setting payment type to platform_fee.`);
            setPaymentType('platform_fee');
            setShowPaymentForm(true); // Allow platform fee payment
          } else {
            // e.g., status is 'lost', 'cancelled', and fee not paid. Payment not applicable.
            console.log(`Status is '${registrationData.status}'. Platform fee not payable for this status.`);
            setError(`目前狀態 (${registrationData.status}) 無法支付平台費用。`);
            // setShowPaymentForm remains false
          }
        }
        
        // Get ticket price from the response
        if (data.zoneDetails && data.zoneDetails.price) {
          setTicketPrice(Number(data.zoneDetails.price));
          console.log(`Setting ticket price: ${data.zoneDetails.price}`);
        } else {
          console.warn("Ticket price not found in API response, using event data");
          // Fetch event details to get actual ticket price if needed
          if (data.registration.zoneName) {
            try {
              const eventResponse = await fetch(`/api/events/${id}`, {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
                  'x-user-id': user?.userId || ''
                }
              });
              
              if (eventResponse.ok) {
                const eventData = await eventResponse.json();
                const selectedZone = eventData.zones?.find((zone: { name: string; price: string }) => 
                  zone.name === data.registration.zoneName
                );
                
                if (selectedZone && selectedZone.price) {
                  setTicketPrice(Number(selectedZone.price));
                  console.log(`Setting ticket price from event data: ${selectedZone.price}`);
                } else {
                  console.error('Zone price not found in event data');
                  setError('無法獲取票券價格信息');
                }
              }
            } catch (eventError) {
              console.error('Error fetching event details:', eventError);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching registration details:', err);
        setError(err instanceof Error ? err.message : '獲取詳情時出錯');
        setShowPaymentForm(false); // Ensure form is hidden on any error during fetch
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && (ticketId || registrationToken)) {
      fetchDetails();
    }
  }, [id, registrationToken, ticketId, isAuthenticated, authLoading, router, user]);

  // This function is called when the CreditCardForm is submitted
  const handlePayment = async (cardData: CardData) => {
    if (!registration) {
      console.error("Cannot process payment: registration data is missing");
      setError("無法處理付款：缺少登記資料");
      return;
    }
    
    if (!user) {
      console.error("Cannot process payment: user data is missing");
      setError("無法處理付款：缺少用戶資料");
      return;
    }
    
    // Use either the original registrationToken or the resolved one
    const tokenToUse = registrationToken || resolvedToken;
    if (!tokenToUse) {
      console.error("Cannot process payment: missing registration token");
      setError("無法處理付款：缺少登記令牌");
      return;
    }

    console.log(`Processing payment for registration: ${tokenToUse}`);
    console.log(`Payment type: ${paymentType}, Card data:`, {
      ...cardData,
      cardNumber: cardData.cardNumber.substr(0, 4) + '********' + cardData.cardNumber.substr(-4)
    });
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Calculate total amount based on payment type
      const totalAmount = paymentType === 'ticket_price' 
        ? ticketPrice * registration.quantity
        : PLATFORM_FEE * registration.quantity;
      
      console.log(`Calculated total amount: ${totalAmount}`);

      // Prepare request payload
      const payload = {
        registrationToken: tokenToUse,
        paymentMethod: 'credit_card',
        cardDetails: {
          lastFourDigits: cardData.cardNumber.slice(-4),
        },
        totalAmount,
        quantity: registration.quantity,
        paymentType
      };
      
      console.log("Sending payment request with payload:", {
        ...payload,
        cardDetails: { lastFourDigits: payload.cardDetails.lastFourDigits }
      });

      // Send payment request
      const response = await fetch('/api/lottery/tickets/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
          'x-user-id': user.userId || ''
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      console.log(`API response (${response.status}):`, responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch { // Prefix 'e' with an underscore as it's not used
        throw new Error(`伺服器回應無效: ${responseText}`);
      }
      
      if (!response.ok) {
        throw new Error(data.error || '支付處理時出錯');
      }

      console.log("Payment successful:", data);
      setSuccess('門票購買成功！您將收到確認電子郵件。');
      
      // Redirect to appropriate page after a short delay
      setTimeout(() => {
        if (paymentType === 'platform_fee') {
          router.push(`/events/${id}/lottery/confirmation?registrationToken=${tokenToUse}`);
        } else {
          router.push('/user/order');
        }
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

  if (error && !registration && !success) { // Only show full page error if no success message
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

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4 pt-20">
        <div className="max-w-4xl mx-auto">
          {/* Display payment type title only if form is relevant or registration exists */}
          {registration && !success && !registration.ticketsPurchased && ( // Hide title if success message implies page is just informational or tickets are purchased
             <h1 className="text-2xl font-bold mb-6">
              {paymentType === 'ticket_price' ? '門票費用付款' : '抽籤登記付款'}
            </h1>
          )}
          
          {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />}
          {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} className="mb-4" />}
          
          {registration && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">{registration.eventName}</h2>
              
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                {/* Informational text based on current state */}
                {showPaymentForm && paymentType === 'ticket_price' && (
                  <p><span className="font-semibold">恭喜中獎！</span> 您需要支付門票費用以確認您的門票。</p>
                )}
                {showPaymentForm && paymentType === 'platform_fee' && (
                  <>
                    <p className="mb-2"><span className="font-semibold">提醒：</span> 您正在支付抽籤登記的費用。如果您在抽籤中被選中，此費用將作為票券的全額付款，無需再次付款。</p>
                    <p>如果您未中籤，此費用將不予退還，作為平台手續費。</p>
                  </>
                )}
                {/* Display messages when payment form is hidden due to specific states */}
                {registration.ticketsPurchased && ( 
                  <div>
                    {/* This message is shown if success alert is dismissed or page reloaded after purchase */}
                    {!success && <p className="mb-2">您已成功購買此活動的門票。</p>}
                    {registration.paymentId && (
                      <button
                        onClick={() => router.push(`/user/order`)} // Simplified to go to main order page
                        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                      >
                        查看我的票券
                      </button>
                    )}
                  </div>
                )}
                {!showPaymentForm && !registration.ticketsPurchased && registration.platformFeePaid && registration.status !== 'won' && (
                  <p>平台費用已支付。請靜候抽籤結果或檢查您的票券狀態。</p>
                )}
                 {/* The main error Alert above will cover other !showPaymentForm cases where error is set */}
              </div>
              
              {/* Conditionally render details and form if not fully purchased and no overriding success message */}
              {!registration.ticketsPurchased && !success && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h3 className="font-semibold mb-4">登記詳情</h3>
                      <table className="w-full text-sm">
                        <tbody className="divide-y">
                          <tr>
                            <td className="py-2 font-medium">登記號碼</td>
                            <td className="py-2">{registration.registrationToken.substring(0, 8)}...</td>
                          </tr>
                          <tr>
                            <td className="py-2 font-medium">選擇區域</td>
                            <td className="py-2">{registration.zoneName}區</td>
                          </tr>
                          <tr>
                            <td className="py-2 font-medium">數量</td>
                            <td className="py-2">{registration.quantity} 張</td>
                          </tr>
                          <tr>
                            <td className="py-2 font-medium">登記時間</td>
                            <td className="py-2">{new Date(registration.createdAt).toLocaleString()}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                
                    <div>
                      <h3 className="font-semibold mb-4">費用詳情</h3>
                      <table className="w-full text-sm">
                        <tbody className="divide-y">
                          <tr>
                            <td className="py-2">
                              {paymentType === 'ticket_price' ? '門票價格' : '平台手續費'}
                            </td>
                            <td className="py-2 text-right">
                              HKD {paymentType === 'ticket_price' 
                                ? ticketPrice 
                                : PLATFORM_FEE} × {registration.quantity}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 font-semibold">總計</td>
                            <td className="py-2 text-right font-semibold">
                              HKD {paymentType === 'ticket_price' 
                                ? (ticketPrice * registration.quantity).toLocaleString('en-HK')
                                : (registration.totalAmount || PLATFORM_FEE * registration.quantity).toLocaleString('en-HK')}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
              
                  {showPaymentForm && (
                    <div className="border-t pt-6">
                      <h3 className="font-semibold mb-4">付款方式</h3>
                      <CreditCardForm onSubmit={handlePayment} isProcessing={isProcessing} />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        </div>
    </>
  );
}

export default LotteryPaymentPage;
