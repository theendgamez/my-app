'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/navbar/Navbar';
import { useAuth } from '@/context/AuthContext';
import { Events } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';


const PLATFORM_FEE = 18; // Platform fee per ticket in HKD

// Fetch event details
async function getEventDetails(eventId: string) {
  const response = await fetch(`/api/events/${eventId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch event: ${response.statusText}`);
  }
  return response.json();
}

const LotteryPage = () => {
  const router = useRouter();
  const { id } = useParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [event, setEvent] = useState<Events | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showMoreLegal, setShowMoreLegal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [eventClosed, setEventClosed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add refs to track authentication state and prevent loops
  const redirectAttemptedRef = useRef(false);
  const dataFetchedRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timer on component unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // 預設帶入用戶電話號碼
  useEffect(() => {
    if (user && typeof user.phoneNumber === 'string') {
      setPhoneNumber(user.phoneNumber);
    }
  }, [user]);

  // Memoize the fetch event details function to prevent recreating on each render
  const fetchEventDetails = useCallback(async () => {
    if (dataFetchedRef.current) return;

    try {
      setLoading(true);
      setError(null);

      if (!id) {
        throw new Error('Invalid event ID');
      }

      const data = await getEventDetails(id as string);

      // Verify this is a lottery event
      if (!data.isDrawMode) {
        router.push(`/events/${id}`);
        return;
      }

      setEvent(data);
      dataFetchedRef.current = true;
    } catch (error) {
      console.error('Error fetching event:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to load event details. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  // Handle authentication and redirects
  useEffect(() => {
    // Only check authentication when authLoading is complete
    if (authLoading) return;

    // If user is not authenticated and we haven't attempted redirect yet
    if (!isAuthenticated && !redirectAttemptedRef.current) {
      // Store flag in ref to prevent multiple redirects
      redirectAttemptedRef.current = true;

      // Save the current path for redirect after login
      const redirectPath = `/events/${id}/lottery`;

      // Add a slight delay to prevent rapid redirect loops
      timerRef.current = setTimeout(() => {
        // Store the redirect flag in session storage to prevent loops
        if (!sessionStorage.getItem('redirectAttempt')) {
          sessionStorage.setItem('redirectAttempt', 'true');
          sessionStorage.setItem('redirectTime', Date.now().toString());
          router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
        } else {
          // Check if the last redirect was more than 5 seconds ago
          const lastRedirect = parseInt(sessionStorage.getItem('redirectTime') || '0');
          const now = Date.now();

          if (now - lastRedirect > 5000) {
            sessionStorage.setItem('redirectTime', now.toString());
            router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
          }
        }
      }, 100);

      return;
    }

    // Clear redirect flag if user is authenticated
    if (isAuthenticated) {
      redirectAttemptedRef.current = false;
      sessionStorage.removeItem('redirectAttempt');

      // Fetch event details only once when authenticated
      if (!dataFetchedRef.current) {
        fetchEventDetails();
      }
    }
  }, [isAuthenticated, authLoading, id, router, fetchEventDetails]);

  const handleRegistration = async () => {
    if (!isAuthenticated || !user || !selectedZone) {
      setError('請先登錄並選擇區域');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Create registration data
      const registrationData = {
        eventId: id,
        userId: user.userId,
        zoneName: selectedZone,
        quantity: quantity,
        status: 'registered'
      };

      const res = await fetch('/api/lottery/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(registrationData)
      });

      if (!res.ok) {
        const errorData = await res.json();

        // Handle specific error cases
        if (errorData.error === '抽籤登記已結束') {
          setError('抽籤登記已結束，無法繼續報名');
          setEventClosed(true);
          return;
        }

        // Handle other errors
        throw new Error(errorData.error || `API error: ${res.status}`);
      }

      const data = await res.json();

      // Redirect to confirmation page
      router.push(`/events/${id}/lottery/confirmation?registrationToken=${data.registrationToken}`);
    } catch (error) {
      console.error('Registration error:', error);
      setError(error instanceof Error ? error.message : '登記時發生錯誤');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (event && (!event.isDrawMode || event.drawDate && new Date(event.drawDate) < new Date())) {
      setEventClosed(true);
      setError('抽籤登記已結束');
    }
  }, [event]);

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

  if (!event) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto p-4 pt-20">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">找不到活動</h1>
          </div>
        </div>
      </>
    );
  }

  const platformFeeTotal = PLATFORM_FEE * quantity;

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4 pt-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">{event.eventName} - 抽籤登記</h1>

          {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />}

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">抽籤說明</h3>
              <p className="text-yellow-700 mb-2">
                這是一個抽籤活動。您現在支付的僅是平台手續費，並不保證能購買到門票。
              </p>
              <p className="text-yellow-700 mb-2">
                抽籤將於 {event.drawDate ? new Date(event.drawDate).toLocaleString() : 'N/A'} 進行。
                如果您被選中，我們將通知您完成票券付款流程。
              </p>
              <p className="text-yellow-700 mb-2">
                <span className="font-semibold">法律合規說明：</span> 本抽籤活動符合香港《賭博條例》(Cap. 349)。平台手續費僅用於購買參與抽籤的資格，而非博彩用途。
              </p>
              <p className="text-yellow-700">
                中籤者獲得的是購買門票的機會，而非直接的金錢獎勵。抽籤過程公平、透明，完全符合香港法律規定。票價設定亦符合《公眾娛樂場所條例》(Cap. 172) 的相關要求。
              </p>

              <button
                type="button"
                onClick={() => setShowMoreLegal(!showMoreLegal)}
                className="mt-3 text-blue-600 hover:text-blue-800 flex items-center text-sm font-medium"
              >
                {showMoreLegal ? '收起詳細法律資訊' : '查閱詳細法律資訊'}
                <svg
                  className={`ml-1 w-4 h-4 transition-transform ${showMoreLegal ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>

              {showMoreLegal && (
                <div className="mt-3 p-3 bg-white border border-yellow-200 rounded-lg text-sm">
                  <h4 className="font-semibold mb-2">詳細法律聲明</h4>
                  <p className="mb-2">依據香港《賭博條例》(Cap. 349)，本抽籤系統不構成非法博彩活動，原因如下：</p>
                  <ul className="list-disc pl-5 mb-2 space-y-1">
                    <li>平台手續費僅用於獲取抽籤資格，非賭注</li>
                    <li>中籤者獲得的是購買門票的權利，而非金錢或獎品</li>
                    <li>所有抽籤程序公開透明，確保公平</li>
                  </ul>
                  <p>本活動亦符合《公眾娛樂場所條例》(Cap. 172)的票價和安全規定。</p>
                </div>
              )}
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

            {!eventClosed ? (
              <form onSubmit={(e) => { e.preventDefault(); handleRegistration(); }} className="space-y-6">
                <div>
                  <label className="block mb-2 font-semibold">選擇區域</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    {event.zones?.map((zone) => (
                      <button
                        key={zone.name}
                        type="button"
                        onClick={() => setSelectedZone(zone.name)}
                        className={`
                          p-4 rounded-lg border-2 text-left transition-all
                          ${
                            selectedZone === zone.name
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-blue-200'
                          }
                        `}
                      >
                        <div className="font-semibold mb-1">{zone.name}區</div>
                        <div className="text-sm text-gray-600">
                          HKD {Number(zone.price).toLocaleString('en-HK')}
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
                    {[1, 2, 3, 4].map((num) => (
                      <option key={num} value={num}>
                        {num} 張
                      </option>
                    ))}
                  </select>
                </div>

                <div className="max-w-xs">
                  <label className="block mb-2 font-semibold">聯絡電話（如需修改請至個人資料頁）:</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    className="w-full p-2 border rounded"
                    required
                    disabled // 不允許直接修改，僅顯示
                  />
                </div>

                {selectedZone && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold mb-3">平台手續費</h3>
                    <table className="w-full">
                      <tbody className="divide-y">
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
                            HKD {platformFeeTotal.toLocaleString('en-HK')}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-6 flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="terms-agreement"
                      name="terms-agreement"
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      required
                    />
                  </div>
                  <label htmlFor="terms-agreement" className="ml-3 text-sm">
                    <span className="font-medium text-gray-700">我同意並確認理解：</span> 這是一個抽籤活動。我現在支付的僅是平台手續費，並不保證能購買到門票。如果我被選中，我將需要額外支付門票費用。
                  </label>
                </div>

                <div className="flex justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex-1 px-6 py-2 rounded bg-gray-200 hover:bg-gray-300"
                  >
                    返回
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedZone || isSubmitting || eventClosed}
                    className={`w-full py-2 px-4 rounded ${
                      !selectedZone || isSubmitting || eventClosed
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isSubmitting ? '提交中...' : '提交抽籤登記'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">抽籤登記已結束，無法繼續報名。</p>
                    <p className="mt-2">
                      <button 
                        onClick={() => router.push('/events')}
                        className="text-sm text-yellow-700 underline hover:text-yellow-600"
                      >
                        返回活動列表
                      </button>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default LotteryPage;
