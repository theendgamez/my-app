"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/navbar/Navbar';
import Sidebar from '@/components/admin/Sidebar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Link from 'next/link';
import { Registration } from '@/types';
import { Users } from '@/types';
interface EventDetails {
  eventId: string;
  eventName: string;
  drawDate: string;
}

export default function AdminLotteryRegistrationDetailPage() {
  const router = useRouter();
  const { token } = useParams();
  const { isAdmin, isAuthenticated, loading: authLoading } = useAuth();
  
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [user, setUser] = useState<Users | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Check if screen is mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false); // Close sidebar on mobile by default
      }
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  // Function to toggle sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Check if user is admin, redirect if not
  useEffect(() => {
    if (!authLoading && isAuthenticated && !isAdmin) {
      router.push('/');
    }
    
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=/admin/lottery/registration/${token}`);
    }
  }, [authLoading, isAuthenticated, isAdmin, router, token]);

  // Fetch registration data
  useEffect(() => {
    const fetchRegistrationDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get current access token
        const accessToken = localStorage.getItem('accessToken') || '';
        
        // Fetch registration details
        const registrationResponse = await fetch(`/api/lottery/registration/${token}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'x-user-id': localStorage.getItem('userId') || ''
          }
        });
        
        if (!registrationResponse.ok) {
          throw new Error(`無法獲取登記詳情: ${registrationResponse.status}`);
        }
        
        const registrationData = await registrationResponse.json();
        setRegistration(registrationData);
        
        // Fetch associated event
        if (registrationData.eventId) {
          const eventResponse = await fetch(`/api/events/${registrationData.eventId}`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
              'x-user-id': localStorage.getItem('userId') || ''
            }
          });
          
          if (eventResponse.ok) {
            const eventData = await eventResponse.json();
            setEvent(eventData);
          }
        }
        
        // Fetch user details
        if (registrationData.userId) {
          const userResponse = await fetch(`/api/admin/users/${registrationData.userId}`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
              'x-user-id': localStorage.getItem('userId') || ''
            }
          });
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            setUser(userData);
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : '獲取數據時發生錯誤');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && isAdmin && token) {
      fetchRegistrationDetails();
    }
  }, [authLoading, isAdmin, token]);

  const getStatusBadge = (status: string, paymentStatus: string) => {
    if (paymentStatus === 'pending') {
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">未付款</span>;
    }
    
    switch (status) {
      case 'registered':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">等待抽籤</span>;
      case 'drawn':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">已抽籤</span>;
      case 'won':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">已中籤</span>;
      case 'lost':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">未中籤</span>;
      default:
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!isAdmin) {
    return null; // This will prevent flash of content before redirect
  }

  return (
    <div>
      <Navbar />
      <div className="flex pt-16">
        <Sidebar 
          isOpen={isSidebarOpen} 
          toggleSidebar={toggleSidebar} 
          isMobile={isMobile} 
        />
        <div className={`container mx-auto p-4 md:p-8 transition-all duration-300 ${isSidebarOpen ? 'ml-0 md:ml-64' : 'ml-0'}`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-0">
              抽籤登記詳情
              {registration && (
                <span className="text-sm text-gray-500 ml-2 font-normal">
                  (#{registration.registrationToken.substring(0, 8)}...)
                </span>
              )}
            </h1>
            <div className="space-x-2">
              {event && (
                <Link
                  href={`/admin/lottery/registrations/${event.eventId}`}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  返回登記清單
                </Link>
              )}
              <Link
                href="/admin/lottery"
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                返回抽籤管理
              </Link>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
              <button 
                onClick={() => setError(null)} 
                className="ml-4 text-red-700 font-bold"
              >
                ×
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="large" />
            </div>
          ) : !registration ? (
            <div className="bg-white p-6 rounded-lg shadow text-center">
              <p className="text-gray-600 mb-4">找不到此抽籤登記資料</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Registration Details Card */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold mb-4">登記資料</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">登記編號</p>
                      <p className="font-medium">{registration.registrationToken}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">狀態</p>
                      <div>{getStatusBadge(registration.status, registration.paymentStatus || 'pending')}</div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">活動名稱</p>
                      <p className="font-medium">{event?.eventName || registration.eventName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">區域</p>
                      <p className="font-medium">{registration.zoneName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">數量</p>
                      <p className="font-medium">{registration.quantity || 0} 張</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">平台費</p>
                      <p className="font-medium">HK$ {(registration.platformFee || 18) * (registration.quantity || 1)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">抽籤日期</p>
                      <p className="font-medium">{formatDate(registration.drawDate || event?.drawDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">創建時間</p>
                      <p className="font-medium">{formatDate(registration.createdAt)}</p>
                    </div>
                    {registration.paymentStatus === 'paid' && (
                      <>
                        <div>
                          <p className="text-sm text-gray-500">支付ID</p>
                          <p className="font-medium">{registration.paymentId || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">付款時間</p>
                          <p className="font-medium">{formatDate(registration.paidAt)}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>


                {/* Payment Card */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold mb-4">付款狀態</h2>
                  <div className="flex items-center space-x-4">
                    {registration.paymentStatus === 'paid' ? (
                      <>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">已支付</span>
                        {registration.paymentId && (
                          <Link 
                            href={`/admin/payments/${registration.paymentId}`} 
                            className="text-blue-600 hover:underline"
                          >
                            查看付款詳情
                          </Link>
                        )}
                      </>
                    ) : (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">未支付</span>
                    )}
                  </div>
                </div>

                {/* Draw Result Card */}
                {registration.status !== 'registered' && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4">抽籤結果</h2>
                    <div className="py-2">
                      {registration.status === 'won' ? (
                        <div className="flex items-center space-x-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="font-medium text-green-700">已中籤</span>
                        </div>
                      ) : registration.status === 'lost' ? (
                        <div className="flex items-center space-x-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          <span className="font-medium text-gray-700">未中籤</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          <span className="font-medium text-blue-700">已抽籤</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Information */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">用戶資料</h2>
                {user ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500">用戶ID</p>
                      <p className="font-medium">{user.userId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">用戶名稱</p>
                      <p className="font-medium">{user.userName || user.email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">電子郵件</p>
                      <p className="font-medium">{user.email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">電話號碼</p>
                      <p className="font-medium">{user.phoneNumber || registration.phoneNumber || '-'}</p>
                    </div>
                    <div className="pt-4">
                      <Link
                        href={`/admin/users/${user.userId}`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        查看用戶詳情 →
                      </Link>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">無法獲取用戶資料</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
