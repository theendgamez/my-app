"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navbar/Navbar';
import { Ticket } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';

// Interface for grouped tickets
interface TicketGroup {
  paymentId: string;
  eventName: string;
  eventDate: string;
  purchaseDate: string;
  tickets: Ticket[];
}

export default function OrderPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [ticketGroups, setTicketGroups] = useState<TicketGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Updated fetchTickets function with better auth handling
  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      // Safe localStorage access
      const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      
      // Fetch tickets using user ID
      const res = await fetch(`/api/users/${user?.userId}/tickets`, {
        headers: {
          'Content-Type': 'application/json',
          // Add authorization header if token exists
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
          // Fallback header with user ID
          'x-user-id': user?.userId || ''
        },
        credentials: 'include'  // Keep this as include to be consistent
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          // Try to refresh token first
          try {
            const refreshRes = await fetch('/api/auth/refresh', {
              method: 'GET',
              credentials: 'include'
            });
            
            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              if (refreshData.accessToken && typeof window !== 'undefined') {
                // Store new token and retry the request - safely
                localStorage.setItem('accessToken', refreshData.accessToken);
                
                // Retry with new token
                const retryRes = await fetch(`/api/users/${user?.userId}/tickets`, {
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${refreshData.accessToken}`,
                    'x-user-id': user?.userId || ''
                  },
                  credentials: 'include'
                });
                
                if (retryRes.ok) {
                  const retryData = await retryRes.json();
                  // Continue with processing data as before
                  const groupedByPayment: Record<string, Ticket[]> = {};
                  retryData.forEach((ticket: Ticket) => {
                    const paymentId = ticket.paymentId || 'unknown';
                    if (!groupedByPayment[paymentId]) {
                      groupedByPayment[paymentId] = [];
                    }
                    groupedByPayment[paymentId].push(ticket);
                  });
                  
                  const groups = Object.entries(groupedByPayment).map(([paymentId, ticketList]) => {
                    const firstTicket = ticketList[0];
                    return {
                      paymentId,
                      eventName: firstTicket.eventName,
                      eventDate: firstTicket.eventDate,
                      purchaseDate: firstTicket.purchaseDate,
                      tickets: ticketList
                    };
                  });
                  
                  groups.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
                  
                  setTicketGroups(groups);
                  return;
                }
              }
            }
            
            // If we get here, token refresh failed or retry failed
            // Safe sessionStorage access with browser check
            const redirectAttemptKey = 'orderRedirectAttempt';
            if (typeof window !== 'undefined') {
              const redirectAttempt = sessionStorage.getItem(redirectAttemptKey);
              
              if (!redirectAttempt) {
                // Set flag to prevent loops
                sessionStorage.setItem(redirectAttemptKey, Date.now().toString());
                router.push(`/login?redirect=${encodeURIComponent('/user/order')}`);
                return;
              } else {
                // Check if the redirect attempt is recent (less than 5 seconds ago)
                const attemptTime = parseInt(redirectAttempt);
                if (Date.now() - attemptTime > 5000) {
                  // If it's been more than 5 seconds, try again
                  sessionStorage.setItem(redirectAttemptKey, Date.now().toString());
                  router.push(`/login?redirect=${encodeURIComponent('/user/order')}`);
                  return;
                } else {
                  // Otherwise show an error to avoid redirect loops
                  throw new Error('登入已過期，請手動重新登入');
                }
              }
            }
          } catch (refreshError) {
            console.error('Token refresh error:', refreshError);
            throw new Error('身份驗證失敗，請重新登入');
          }
        }
        throw new Error('Failed to fetch tickets');
      }
      
      const data = await res.json();
      
      // Group tickets by payment ID
      const groupedByPayment: Record<string, Ticket[]> = {};
      data.forEach((ticket: Ticket) => {
        const paymentId = ticket.paymentId || 'unknown';
        if (!groupedByPayment[paymentId]) {
          groupedByPayment[paymentId] = [];
        }
        groupedByPayment[paymentId].push(ticket);
      });
      
      // Convert to array format for easier rendering
      const groups = Object.entries(groupedByPayment).map(([paymentId, ticketList]) => {
        // Get common data from first ticket in group
        const firstTicket = ticketList[0];
        return {
          paymentId,
          eventName: firstTicket.eventName,
          eventDate: firstTicket.eventDate,
          purchaseDate: firstTicket.purchaseDate,
          tickets: ticketList
        };
      });
      
      // Sort by purchase date, newest first
      groups.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
      
      setTicketGroups(groups);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  // Add cleanup for redirect attempt in useEffect
  useEffect(() => {
    // Check authentication first
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent('/user/order')}`);
      return;
    }

    // Only fetch tickets if user is authenticated
    if (!authLoading && isAuthenticated && user) {
      fetchTickets();
    }
    
    // Cleanup function - safely access sessionStorage
    return () => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('orderRedirectAttempt');
      }
    };
  }, [isAuthenticated, authLoading, user, router, fetchTickets]);

  // Format date function
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('zh-HK', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch  {
      return dateString;
    }
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4 pt-20">
        {authLoading ? (
          <div className="flex justify-center items-center py-10">
            <LoadingSpinner size="large" />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">我的票券</h1>
            
            {loading ? (
              <div className="flex justify-center items-center py-10">
                <LoadingSpinner size="large" />
              </div>
            ) : error ? (
              <div className="p-4 border border-red-200 bg-red-50 text-red-600 rounded-lg mb-6">
                <p>{error}</p>
              </div>
            ) : ticketGroups.length === 0 ? (
              <div className="bg-white p-6 rounded-lg shadow-md text-center py-12">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg text-gray-600 mb-4">您還沒有任何票券</p>
                <button 
                  onClick={() => router.push('/events')}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                >
                  瀏覽活動
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {ticketGroups.map((group) => (
                  <div key={group.paymentId} className="bg-white rounded-lg shadow-md overflow-hidden">
                    {/* Payment header */}
                    <div className="bg-blue-50 p-4 border-b border-blue-100">
                      <h2 className="text-lg font-semibold text-blue-800">{group.eventName}</h2>
                      <div className="flex justify-between text-sm">
                        <span>購買時間: {formatDate(group.purchaseDate)}</span>
                        <span>
                          訂單編號: {group.paymentId.substring(0, 8)}...
                        </span>
                      </div>
                    </div>
                    
                    {/* Order summary - simplified without ticket details */}
                    <div className="p-4">
                      <div className="flex flex-wrap justify-between items-center">
                        <div>
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">活動日期:</span> {formatDate(group.eventDate)}
                          </p>
                          <p className="text-sm text-gray-700 mt-1">
                            <span className="font-medium">票券數量:</span> {group.tickets.length} 張
                          </p>
                        </div>
                        
                        <button 
                          onClick={() => router.push(`/user/order/${group.paymentId}`)}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors mt-2 sm:mt-0"
                        >
                          查看票券詳情
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}