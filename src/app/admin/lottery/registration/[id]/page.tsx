'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminPage from '@/components/admin/AdminPage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { formatDate as formatDateUtil } from '@/utils/formatters'; // Import and alias
import { useTranslations } from '@/hooks/useTranslations'; // Import useTranslations

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
  const { t, locale } = useTranslations(); // Initialize useTranslations
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
        throw new Error('Failed to fetch registration data'); // This could be t('errorFetchingRegistration')
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
      setError(t('errorFetchingRegistration'));
    } finally {
      setLoading(false);
    }
  }, [id, user?.userId, t]); // Added t to dependencies

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
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">{t('unpaid')}</span>;
    }
    
    switch (status) {
      case 'registered':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">{t('statusWaitingDraw')}</span>;
      case 'drawn':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">{t('statusDrawn')}</span>;
      case 'won':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">{t('statusWon')}</span>;
      case 'lost':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">{t('statusLost')}</span>;
      default:
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return formatDateUtil(dateString, 'Pp', { locale }); // Use imported formatter with locale
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
    <AdminPage title={t('lotteryRegistrationDetails')}>
      <div className="container-responsive">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {t('lotteryRegistrationDetails')}
              {registrationData && (
                <span className="text-sm text-gray-500 ml-2 font-normal">
                  (#{(registrationData.registrationId || registrationData.registrationToken || id)?.toString().substring(0, 8) ?? ''}...)
                </span>
              )}
            </h1>
            <button
              onClick={() => router.back()}
              className="btn-secondary" // Assuming btn-secondary is styled
            >
              {t('backToList')}
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              {error}
            </div>
          )}

          {/* Registration Information */}
          <div className="card p-6 mb-6"> {/* Assuming card is styled */}
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('registrationInfo')}</h2>
            {registrationData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('registrationId')}</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {registrationData.registrationId || registrationData.registrationToken || id}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('registrationDate')}</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDate(registrationData.registrationDate || registrationData.createdAt)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('status')}</label>
                  <div className="mt-1 flex items-center gap-2">
                    {getStatusBadge(registrationData.status, registrationData.paymentStatus)}
                  </div>
                </div>
                {(registrationData.selectedZones || registrationData.zoneName) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('selectedZone')}</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {registrationData.selectedZones?.join(', ') || registrationData.zoneName}
                    </p>
                  </div>
                )}
                {registrationData.quantity && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('quantity')}</label>
                    <p className="mt-1 text-sm text-gray-900">{registrationData.quantity} {t('ticketsUnit')}</p>
                  </div>
                )}
                {registrationData.platformFee && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('platformFeeLabel')}</label> {/* Changed from platformFee to platformFeeLabel */}
                    <p className="mt-1 text-sm text-gray-900">
                      HK$ {registrationData.platformFee * (registrationData.quantity || 1)}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">{t('loadingRegistrationInfo')}</p>
            )}
          </div>

          {/* User Information */}
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('userInfo')}</h2>
            {userData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('userName')}</label>
                  <p className="mt-1 text-sm text-gray-900">{userData.userName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('email')}</label>
                  <p className="mt-1 text-sm text-gray-900">{userData.email}</p>
                </div>
                {(userData.phone || userData.phoneNumber || registrationData?.phoneNumber) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('phoneNumber')}</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {userData.phone || userData.phoneNumber || registrationData?.phoneNumber}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('userId')}</label>
                  <p className="mt-1 text-sm text-gray-500">{userData.userId}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">{t('loadingUserInfo')}</p>
            )}
          </div>

          {/* Event Information */}
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('eventInfo')}</h2>
            {eventData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('eventName')}</label>
                  <p className="mt-1 text-sm text-gray-900">{eventData.eventName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('eventDate')}</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(eventData.eventDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('eventLocation')}</label>
                  <p className="mt-1 text-sm text-gray-900">{eventData.location}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('eventId')}</label>
                  <p className="mt-1 text-sm text-gray-500">{eventData.eventId}</p>
                </div>
              </div>
            ) : registrationData?.eventName ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('eventName')}</label>
                  <p className="mt-1 text-sm text-gray-900">{registrationData.eventName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('eventId')}</label>
                  <p className="mt-1 text-sm text-gray-500">{registrationData.eventId}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">{t('loadingEventInfo')}</p>
            )}
          </div>

          {/* Payment Information */}
          {registrationData?.paymentStatus && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('paymentInfo')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('paymentStatus')}</label>
                  <div className="mt-1">
                    {registrationData.paymentStatus === 'paid' ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">{t('paid')}</span>
                    ) : (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">{t('unpaid')}</span>
                    )}
                  </div>
                </div>
                {registrationData.paymentId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('paymentId')}</label>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-sm text-gray-900">{registrationData.paymentId}</p>
                      <Link 
                        href={`/admin/payments/${registrationData.paymentId}`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        {t('viewDetails')}
                      </Link>
                    </div>
                  </div>
                )}
                {registrationData.paidAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('paymentTime')}</label>
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
