"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/navbar/Navbar';
import Sidebar from '@/components/admin/Sidebar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Link from 'next/link';
import { formatDate as formatDateUtil } from '@/utils/formatters'; // Import the new formatter
import { useTranslations } from '@/hooks/useTranslations'; // Import useTranslations

interface LotteryEvent {
  eventId: string;
  eventName: string;
  drawDate: string;
  status: string;
  registerCount: number;
  remainingDays: number;
}

export default function AdminLotteryPage() {
  const router = useRouter();
  const { isAdmin, isAuthenticated, loading: authLoading } = useAuth();
  const { t, locale } = useTranslations(); // Initialize useTranslations
  const [events, setEvents] = useState<LotteryEvent[]>([]);
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
      router.push('/login?redirect=/admin/lottery');
    }
  }, [authLoading, isAuthenticated, isAdmin, router]);

  // Fetch lottery events
  useEffect(() => {
    const fetchLotteryEvents = async () => {
      try {
        setLoading(true);

        // Get current access token
        const accessToken = localStorage.getItem('accessToken') || '';

        const response = await fetch('/api/admin/lottery/events', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'x-user-id': localStorage.getItem('userId') || ''
          },
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          setEvents(data || []);
        } else {
          // Handle different error status codes
          if (response.status === 403) {
            setError(t('errorFetchingLotteryEvents')); // Use translated error
            console.error('Admin lottery access denied. Check user role permissions.');

            // Optional: could add redirect to login here
            setTimeout(() => {
              router.push('/login?redirect=/admin/lottery');
            }, 2000);
          } else {
            setError(t('errorFetchingLotteryEvents')); // Use translated error
          }
        }
      } catch (err) {
        console.error('Error fetching lottery events:', err);
        setError(t('errorFetchingLotteryEvents')); // Use translated error
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && isAdmin) {
      fetchLotteryEvents();
    }
  }, [authLoading, isAdmin, router, t]); // Added t to dependency array

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'registering':
        return 'bg-blue-100 text-blue-800';
      case 'drawing':
        return 'bg-purple-100 text-purple-800';
      case 'drawn':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string, formatOptions?: Intl.DateTimeFormatOptions) => {
    return formatDateUtil(dateString, undefined, { locale, ...formatOptions });
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
            <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-0">{t('lotteryManagement')}</h1>
            <Link
              href="/admin/lottery/draw"
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              {t('performDraw')}
            </Link>
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
          ) : events.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow text-center">
              <p className="text-gray-600 mb-4">{t('noLotteryEvents')}</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('eventName')}</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('drawDate')}</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('status')}</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('registeredCount')}</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('remainingDays')}</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {events.map((event) => (
                    <tr key={event.eventId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{event.eventName}</div>
                        <div className="text-xs text-gray-500">{event.eventId.substring(0, 8)}...</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {event.drawDate ? formatDate(event.drawDate, { year: 'numeric', month: '2-digit', day: '2-digit' }) : t('notApplicable')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {event.drawDate ? formatDate(event.drawDate, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(event.status)}`}>
                          {event.status === 'registering' && t('statusRegistering')}
                          {event.status === 'drawing' && t('statusReadyForDraw')}
                          {event.status === 'drawn' && t('statusDrawn')}
                          {event.status === 'closed' && t('statusClosed')}
                          {!['registering', 'drawing', 'drawn', 'closed'].includes(event.status) && event.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.registerCount} {t('user')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {event.remainingDays > 0 ? (
                          <span className="text-green-600">{event.remainingDays} {t('days')}</span>
                        ) : (
                          <span className="text-red-600">0 {t('days')}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Link
                            href={`/admin/lottery/registrations/${event.eventId}`}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            {t('viewRegistrations')}
                          </Link>
                          {event.status === 'drawing' && (
                            <Link
                              href={`/admin/lottery/draw?eventId=${event.eventId}`}
                              className="text-purple-600 hover:text-purple-900"
                            >
                              {t('performDraw')}
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
