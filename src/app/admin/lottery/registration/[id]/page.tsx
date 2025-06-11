'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminPage from '@/components/admin/AdminPage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

interface RegistrationData {
  registrationId?: string;
  registrationToken?: string;
  userId: string;
  eventId: string;
  status: string;
  registrationDate: string;
  selectedZones?: string[];
  zoneName?: string;
  quantity?: number;
  paymentStatus?: string;
  platformFee?: number;
  drawDate?: string;
  paymentId?: string;
  paidAt?: string;
  createdAt?: string;
  phoneNumber?: string;
  eventName?: string;
}

interface UserData {
  userId: string;
  userName: string;
  email: string;
  phone?: string;
  phoneNumber?: string;
}

interface EventData {
  eventId: string;
  eventName: string;
  eventDate: string;
  location: string;
  drawDate?: string;
}

export default function LotteryRegistrationDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [eventData, setEventData] = useState<EventData | null>(null);

  const fetchRegistrationData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Try multiple API endpoints to handle both ID and token formats
      let response;
      
      // First try the admin lottery registration endpoint
      response = await fetch(`/api/admin/lottery/registration/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
          'x-user-id': user?.userId || '',
        },
      });

      // If that fails, try the general lottery registration endpoint
      if (!response.ok && response.status === 404) {
        response = await fetch(`/api/lottery/registration/${id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
            'x-user-id': user?.userId || '',
          },
        });
      }

      if (!response.ok) {
        throw new Error('Failed to fetch registration data');
      }

      const data = await response.json();
      
      // Handle different response formats
      if (data.registration) {
        setRegistrationData(data.registration);
        setUserData(data.user);
        setEventData(data.event);
      } else {
        // Direct registration data
        setRegistrationData(data);
        
        // Fetch additional user data if userId is available
        if (data.userId) {
          try {
            const userResponse = await fetch(`/api/admin/users/${data.userId}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
                'x-user-id': user?.userId || '',
              },
            });
            
            if (userResponse.ok) {
              const userData = await userResponse.json();
              setUserData(userData);
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
          }
        }

        // Fetch event data if eventId is available
        if (data.eventId) {
          try {
            const eventResponse = await fetch(`/api/events/${data.eventId}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
                'x-user-id': user?.userId || '',
              },
            });
            
            if (eventResponse.ok) {
              const eventData = await eventResponse.json();
              setEventData(eventData);
            }
          } catch (error) {
            console.error('Error fetching event data:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching registration data:', error);
      setError('無法獲取抽籤記錄資料');
    } finally {
      setLoading(false);
    }
  }, [id, user?.userId]);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/admin/login');
      return;
    }

    if (!authLoading && isAdmin && id) {
      fetchRegistrationData();
    }
  }, [authLoading, isAdmin, id, router, fetchRegistrationData]);

  const getStatusBadge = (status: string, paymentStatus?: string) => {
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleString('zh-TW');
    } catch {
      return dateString;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AdminPage title="抽籤記錄詳情">
      <div className="container-responsive">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              抽籤記錄詳情
              {registrationData && (
                <span className="text-sm text-gray-500 ml-2 font-normal">
                  (#{(registrationData.registrationId || registrationData.registrationToken || id)?.toString().substring(0, 8) ?? ''}...)
                </span>
              )}
            </h1>
            <button
              onClick={() => router.back()}
              className="btn-secondary"
            >
              返回列表
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              {error}
            </div>
          )}

          {/* Registration Information */}
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">抽籤資訊</h2>
            {registrationData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">記錄ID</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {registrationData.registrationId || registrationData.registrationToken || id}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">報名日期</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDate(registrationData.registrationDate || registrationData.createdAt)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">狀態</label>
                  <div className="mt-1 flex items-center gap-2">
                    {getStatusBadge(registrationData.status, registrationData.paymentStatus)}
                  </div>
                </div>
                {(registrationData.selectedZones || registrationData.zoneName) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">選擇區域</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {registrationData.selectedZones?.join(', ') || registrationData.zoneName}
                    </p>
                  </div>
                )}
                {registrationData.quantity && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">數量</label>
                    <p className="mt-1 text-sm text-gray-900">{registrationData.quantity} 張</p>
                  </div>
                )}
                {registrationData.platformFee && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">平台費</label>
                    <p className="mt-1 text-sm text-gray-900">
                      HK$ {registrationData.platformFee * (registrationData.quantity || 1)}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">無法載入抽籤資訊</p>
            )}
          </div>

          {/* User Information */}
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">用戶資訊</h2>
            {userData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">用戶名稱</label>
                  <p className="mt-1 text-sm text-gray-900">{userData.userName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">電子郵件</label>
                  <p className="mt-1 text-sm text-gray-900">{userData.email}</p>
                </div>
                {(userData.phone || userData.phoneNumber || registrationData?.phoneNumber) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">電話號碼</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {userData.phone || userData.phoneNumber || registrationData?.phoneNumber}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">用戶ID</label>
                  <p className="mt-1 text-sm text-gray-500">{userData.userId}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">無法載入用戶資訊</p>
            )}
          </div>

          {/* Event Information */}
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">活動資訊</h2>
            {eventData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">活動名稱</label>
                  <p className="mt-1 text-sm text-gray-900">{eventData.eventName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">活動日期</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(eventData.eventDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">活動地點</label>
                  <p className="mt-1 text-sm text-gray-900">{eventData.location}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">活動ID</label>
                  <p className="mt-1 text-sm text-gray-500">{eventData.eventId}</p>
                </div>
              </div>
            ) : registrationData?.eventName ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">活動名稱</label>
                  <p className="mt-1 text-sm text-gray-900">{registrationData.eventName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">活動ID</label>
                  <p className="mt-1 text-sm text-gray-500">{registrationData.eventId}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">無法載入活動資訊</p>
            )}
          </div>

          {/* Payment Information */}
          {registrationData?.paymentStatus && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">付款資訊</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">付款狀態</label>
                  <div className="mt-1">
                    {registrationData.paymentStatus === 'paid' ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">已支付</span>
                    ) : (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">未支付</span>
                    )}
                  </div>
                </div>
                {registrationData.paymentId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">支付ID</label>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-sm text-gray-900">{registrationData.paymentId}</p>
                      <Link 
                        href={`/admin/payments/${registrationData.paymentId}`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        查看詳情
                      </Link>
                    </div>
                  </div>
                )}
                {registrationData.paidAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">付款時間</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(registrationData.paidAt)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminPage>
  );
}
