'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/navbar/Navbar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import CreditCardForm from '@/components/ui/CreditCardForm';
import { Registration } from '@/types';

const PLATFORM_FEE = 18; // Platform fee per ticket in HKD

// Define interface for registration lookup
interface RegistrationLookup {
  registrationToken: string;
  ticketIds?: string[];
  eventId: string;
}

export default function LotteryPaymentPage() {
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

  useEffect(() => {
    // Check authentication first
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(`/events/${id}/lottery/payment?registrationToken=${registrationToken}`)}`);
      return;
    }

    const fetchRegistrationData = async () => {
      try {
        setLoading(true);
        let token = registrationToken;
        
        // If we have ticketId but no registrationToken, try to find the registration
        if (ticketId && !token) {
          const registrations = await fetch(`/api/registrations/lottery`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
              'x-user-id': user?.userId || ''
            }
          });
          
          if (registrations.ok) {
            const data = await registrations.json();
            const matchingReg = data.registrations?.find((reg: RegistrationLookup) => 
              reg.ticketIds?.includes(ticketId) || reg.eventId === id
            );
            if (matchingReg) {
              token = matchingReg.registrationToken;
            }
          }
        }

        if (!token) {
          setError('缺少抽籤登記令牌');
          return;
        }

        const response = await fetch(`/api/lottery/registration/${token}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
            'x-user-id': user?.userId || ''
          }
        });

        if (!response.ok) {
          throw new Error('無法獲取登記詳情');
        }

        const data = await response.json();
        setRegistration(data);
        
        // Determine payment type based on registration status and URL parameters
        if (ticketId && data.status === 'won' && !data.ticketsPurchased) {
          setPaymentType('ticket_price');
          
          // Fetch event details to get actual ticket price
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
                zone.name === data.zoneName
              );
              
              if (selectedZone && selectedZone.price) {
                setTicketPrice(Number(selectedZone.price));
              } else {
                setError('無法獲取票券價格信息');
                return;
              }
            }
          } catch (eventError) {
            console.error('Error fetching event details:', eventError);
            setError('無法獲取活動詳情');
            return;
          }
        } else if (!data.platformFeePaid) {
          setPaymentType('platform_fee');
        }
      } catch (err) {
        console.error('Error fetching registration:', err);
        setError(err instanceof Error ? err.message : '獲取詳情時出錯');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && (ticketId || registrationToken)) {
      fetchRegistrationData();
    }
  }, [ticketId, registrationToken, isAuthenticated, authLoading, router, user, id]);

  const handlePayment = async () => {
    if (!registration) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const apiEndpoint = paymentType === 'ticket_price' 
        ? '/api/payments/lottery/ticket'
        : '/api/payments/lottery/platform-fee';
        
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
          'x-user-id': user?.userId || ''
        },
        body: JSON.stringify({
          registrationToken: registration.registrationToken,
          ticketId: ticketId,
          paymentType: paymentType
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '支付處理時出錯');
      }

      const successMessage = paymentType === 'ticket_price' 
        ? '門票費用支付成功！您的門票已確認。'
        : '抽籤登記費支付成功！您將收到確認電子郵件。';
      
      setSuccess(successMessage);
      
      // Redirect to confirmation page after a short delay - use actual registration token
      setTimeout(() => {
        router.push(`/events/${id}/lottery/confirmation?registrationToken=${registration.registrationToken}`);
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

  if (error && !registration) {
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
          <h1 className="text-2xl font-bold mb-6">
            {paymentType === 'ticket_price' ? '門票費用付款' : '抽籤登記付款'}
          </h1>
          
          {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />}
          {success && <Alert type="success" message={success} className="mb-4" />}
          
          {registration && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">{registration.eventName}</h2>
              
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                {paymentType === 'ticket_price' ? (
                  <p>
                    <span className="font-semibold">恭喜中獎！</span> 您需要支付門票費用以確認您的門票。
                  </p>
                ) : (
                  <>
                    <p className="mb-2">
                      <span className="font-semibold">提醒：</span> 您正在支付抽籤登記的費用。如果您在抽籤中被選中，此費用將作為票券的全額付款，無需再次付款。
                    </p>
                    <p>如果您未中籤，此費用將不予退還，作為平台手續費。</p>
                  </>
                )}
              </div>
              
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
              
              <div className="border-t pt-6"></div>
                <h3 className="font-semibold mb-4">付款方式</h3>
                <CreditCardForm onSubmit={handlePayment} isProcessing={isProcessing} />
            </div>
          )}
        </div>
        </div>
    </>
  );
}
