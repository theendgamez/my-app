"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/navbar/Navbar';
import Sidebar from '@/components/admin/Sidebar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Link from 'next/link';

interface EventDetails {
  eventId: string;
  eventName: string;
  drawDate: string;
  status: string;
}

interface Registration {
  registrationToken: string;
  userId: string;
  userName?: string;
  phoneNumber?: string;
  zoneName: string;
  quantity: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  paidAt?: string;
}

export default function AdminLotteryRegistrationsPage() {
  const router = useRouter();
  const { eventId } = useParams();
  const { isAdmin, isAuthenticated, loading: authLoading } = useAuth();
  
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Check if user is admin, redirect if not
  useEffect(() => {
    if (!authLoading && isAuthenticated && !isAdmin) {
      router.push('/');
    }
    
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=/admin/lottery/registrations/${eventId}`);
    }
  }, [authLoading, isAuthenticated, isAdmin, router, eventId]);

  // Fetch event and registrations data
  useEffect(() => {
    const fetchEventAndRegistrations = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get current access token
        const accessToken = localStorage.getItem('accessToken') || '';
        
        // Fetch event details first
        const eventResponse = await fetch(`/api/events/${eventId}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'x-user-id': localStorage.getItem('userId') || ''
          }
        });
        
        if (!eventResponse.ok) {
          throw new Error(`無法獲取活動資料: ${eventResponse.status}`);
        }
        
        const eventData = await eventResponse.json();
        setEvent(eventData);
        
        // Then fetch registrations for this event
        const registrationsResponse = await fetch(`/api/admin/lottery/registrations/${eventId}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'x-user-id': localStorage.getItem('userId') || ''
          }
        });
        
        if (!registrationsResponse.ok) {
          throw new Error(`無法獲取抽籤登記: ${registrationsResponse.status}`);
        }
        
        const registrationsData = await registrationsResponse.json();
        setRegistrations(registrationsData.registrations || []);
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : '獲取數據時發生錯誤');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && isAdmin && eventId) {
      fetchEventAndRegistrations();
    }
  }, [authLoading, isAdmin, eventId]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, set default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedRegistrations = [...registrations].sort((a, b) => {
    // Handle different field types correctly
    if (sortField === 'createdAt' || sortField === 'paidAt') {
      // Date fields
      const dateA = a[sortField as keyof Registration] ? new Date(a[sortField as keyof Registration] as string).getTime() : 0;
      const dateB = b[sortField as keyof Registration] ? new Date(b[sortField as keyof Registration] as string).getTime() : 0;
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    } else {
      // String and number fields
      const valueA = a[sortField as keyof Registration] || '';
      const valueB = b[sortField as keyof Registration] || '';
      
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
      }
      
      // Convert to string for comparison
      const strA = String(valueA).toLowerCase();
      const strB = String(valueB).toLowerCase();
      
      if (sortDirection === 'asc') {
        return strA.localeCompare(strB);
      } else {
        return strB.localeCompare(strA);
      }
    }
  });

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
              {event ? (
                <>
                  抽籤登記 - {event.eventName}
                  <span className="text-sm text-gray-500 ml-2 font-normal">
                    ({registrations.length} 人)
                  </span>
                </>
              ) : (
                '抽籤登記'
              )}
            </h1>
            <Link
              href="/admin/lottery"
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              返回抽籤管理
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
          ) : registrations.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow text-center">
              <p className="text-gray-600 mb-4">此活動沒有抽籤登記</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('registrationToken')}
                      >
                        抽籤編號
                        {sortField === 'registrationToken' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('userName')}
                      >
                        用戶
                        {sortField === 'userName' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('phoneNumber')}
                      >
                        電話
                        {sortField === 'phoneNumber' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('zoneName')}
                      >
                        區域
                        {sortField === 'zoneName' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('quantity')}
                      >
                        數量
                        {sortField === 'quantity' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('status')}
                      >
                        狀態
                        {sortField === 'status' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('createdAt')}
                      >
                        登記時間
                        {sortField === 'createdAt' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedRegistrations.map((registration) => (
                      <tr key={registration.registrationToken} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{registration.registrationToken.substring(0, 8)}...</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{registration.userName || '未知用戶'}</div>
                          <div className="text-xs text-gray-500">{registration.userId.substring(0, 8)}...</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{registration.phoneNumber || '無'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{registration.zoneName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {registration.quantity} 張
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(registration.status, registration.paymentStatus)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(registration.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(registration.createdAt).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link 
                            href={`/admin/lottery/registration/${registration.registrationToken}`}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            查看詳情
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
