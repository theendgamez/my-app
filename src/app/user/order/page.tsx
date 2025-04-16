"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navbar/Navbar';
import { Ticket } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function OrderPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check for user authentication first
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      // Redirect to login with a return path
      router.push(`/login?redirect=${encodeURIComponent('/user/order')}`);
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      setUser(userData);
    } catch (err) {
      console.error('Error parsing user data:', err);
      router.push(`/login?redirect=${encodeURIComponent('/user/order')}`);
      return;
    }
  }, [router]);

  useEffect(() => {
    // Only fetch tickets if we have a user
    if (!user) return;
    
    const fetchTickets = async () => {
      try {
        // Get access token if available
        const accessToken = localStorage.getItem('accessToken');
        
        // Fetch tickets using user ID
        const res = await fetch(`/api/users/${user.userId}/tickets`, {
          headers: {
            'Content-Type': 'application/json',
            // Add authorization header if token exists
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
            // Fallback header with user ID
            'x-user-id': user.userId
          }
        });
        
        if (!res.ok) {
          if (res.status === 401) {
            router.push(`/login?redirect=${encodeURIComponent('/user/order')}`);
            return;
          }
          throw new Error('Failed to fetch tickets');
        }
        
        const data = await res.json();
        setTickets(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [user, router]);

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4 pt-20">
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
          ) : tickets.length === 0 ? (
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
            <div className="space-y-4">
              {tickets.map(ticket => (
                <div key={ticket.ticketId} className="bg-white p-6 rounded-lg shadow-md">
                  <h2 className="text-lg font-semibold mb-3 text-blue-700">{ticket.eventName}</h2>
                  <div className="space-y-2">
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-gray-600">票券號碼:</span> 
                      <span className="font-medium">{ticket.ticketId.substring(0, 8)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-gray-600">活動時間:</span> 
                      <span>{new Date(ticket.eventDate).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-gray-600">區域:</span> 
                      <span className="font-medium">{ticket.zone}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">座位:</span> 
                      <span className="font-medium">{ticket.seatNumber}</span>
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