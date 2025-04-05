'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/navbar/Navbar';
import { useAuth } from '@/context/AuthContext';
import { Alert } from '@/components/ui/Alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Ticket } from '@/types';

export default function UserTicketsPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verify the user is accessing their own tickets
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (user && params.id !== user.userId) {
      router.push(`/user/${user.userId}/userTickets`);
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
        const res = await fetch(`/api/tickets/user/${user.userId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
          }
        });
        
        if (!res.ok) {
          throw new Error('無法獲取票券資訊');
        }
        
        const data = await res.json();
        setTickets(data);
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
          
          {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />}
          
          {tickets.length === 0 ? (
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
                        {new Date(ticket.eventDate).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                        已確認
                      </span>
                    </div>
                  </div>
                  
                  <div className="border-t border-b py-3 mb-4">
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