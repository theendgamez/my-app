'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/navbar/Navbar';
import { useAuth } from '@/context/AuthContext';
import { fetchWithAuth } from '@/utils/fetchWithAuth';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Ticket } from '@/types';

interface TicketWithEvent extends Ticket {
  event?: {
    eventId: string;
    eventName: string;
    eventDate: string;
    eventLocation: string;
    location?: string;
    eventImage: string;
  };
}

export default function UserTicketsPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [tickets, setTickets] = useState<TicketWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verify the user is accessing their own tickets
  useEffect(() => {
    if (authLoading) return; // Wait for auth to complete
    if (!isAuthenticated) {
      // Use replace instead of push to avoid adding to history stack
      router.replace(`/login?redirect=${encodeURIComponent('/user/' + params.id + '/order')}`);
      return;
    }
    if (user && params.id !== user.userId) {
      // Use replace and go to the correct user's order page
      router.replace(`/user/${user.userId}/order`);
      return;
    }
  }, [authLoading, isAuthenticated, router, user, params.id]);

  // Fetch user's tickets
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const fetchUserTickets = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetchWithAuth(`/api/tickets/user/${user.userId}`);

        if (res.status === 401) {
          console.error('Authentication failed:', await res.text());
          
          // Check if token exists but might be expired
          const accessToken = localStorage.getItem('accessToken');
          if (accessToken) {
            // Try to refresh token
            const refreshRes = await fetch('/api/auth/refresh', {
              credentials: 'include' // Send cookies
            });
            
            if (refreshRes.ok) {
              // Token refreshed, retry the request
              window.location.reload();
              return;
            } else {
              setError('您的登入已過期，請重新登入');
            }
          } else {
            setError('請先登入以查看您的票券');
          }
          setLoading(false);
          return;
        }

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: '無法獲取票券資訊' }));
          throw new Error(errorData.error || '無法獲取票券資訊');
        }

        const data = await res.json();
        
        // Group tickets by eventId to fetch event details efficiently
        const eventGroups: { [key: string]: Ticket[] } = {};
        data.forEach((ticket: Ticket) => {
          if (!eventGroups[ticket.eventId]) {
            eventGroups[ticket.eventId] = [];
          }
          eventGroups[ticket.eventId].push(ticket);
        });
        
        // Fetch event details once per unique event
        const ticketsWithEvents: TicketWithEvent[] = [];
        
        await Promise.all(
          Object.entries(eventGroups).map(async ([eventId, tickets]) => {
            try {
              const eventResponse = await fetchWithAuth(`/api/events/${eventId}`);
              if (eventResponse.ok) {
                const event = await eventResponse.json();
                // Add event data to each ticket in this group
                tickets.forEach(ticket => {
                  ticketsWithEvents.push({
                    ...ticket,
                    event
                  });
                });
              } else {
                // If event fetch fails, still include tickets without event data
                tickets.forEach(ticket => {
                  ticketsWithEvents.push(ticket as TicketWithEvent);
                });
              }
            } catch (error) {
              console.error(`Error fetching event ${eventId}:`, error);
              // Add tickets without event data on error
              tickets.forEach(ticket => {
                ticketsWithEvents.push(ticket as TicketWithEvent);
              });
            }
          })
        );
        
        // Sort tickets by event date (most recent first)
        ticketsWithEvents.sort((a, b) => {
          const dateA = new Date(a.eventDate).getTime();
          const dateB = new Date(b.eventDate).getTime();
          return dateB - dateA; // Descending order
        });
        
        setTickets(ticketsWithEvents);
      } catch (err) {
        console.error('Error fetching tickets:', err);
        setError(err instanceof Error ? err.message : '載入票券時發生錯誤');
      } finally {
        setLoading(false);
      }
    };

    fetchUserTickets();
  }, [isAuthenticated, user]);

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

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4 pt-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">我的票券</h1>

          {error && (
            <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-lg mb-6">
              <div className="flex items-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">{error}</span>
              </div>
              {error.includes('身份驗證') && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => router.push(`/login?redirect=${encodeURIComponent('/user/' + params.id + '/order')}`)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    重新登入
                  </button>
                  <button
                    onClick={() => {
                      setLoading(true);
                      // Force token refresh
                      localStorage.removeItem('accessToken');
                      // Add a timestamp parameter to force a fresh request
                      router.push(`/login?redirect=${encodeURIComponent('/user/' + params.id + '/order')}&t=${Date.now()}`);
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                  >
                    清除快取並登入
                  </button>
                </div>
              )}
            </div>
          )}

          {tickets.length === 0 && !error ? (
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <p className="text-gray-600 mb-4">您目前沒有任何票券</p>
              <button
                onClick={() => router.push('/events')}
                className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                瀏覽活動
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div
                  key={ticket.ticketId}
                  className="bg-white p-6 rounded-lg shadow-md"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-semibold">{ticket.eventName}</h2>
                      <p className="text-gray-600">
                        開始時間: {new Date(ticket.eventDate).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                        已付款
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-b py-3 mb-4">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <span className="text-gray-600">地址:</span>
                      <span className="text-right">{ticket.event?.eventLocation || ticket.event?.location || '未提供地址'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <span className="text-gray-600">區域:</span>
                      <span className="text-right">{ticket.zone}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <span className="text-gray-600">座位號碼:</span>
                      <span className="text-right">{ticket.seatNumber}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <span className="text-gray-600">票價:</span>
                      <span className="text-right">HKD {ticket.price.toLocaleString('en-HK')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}