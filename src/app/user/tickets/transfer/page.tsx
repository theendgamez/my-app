'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/navbar/Navbar';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import { Ticket } from '@/types';

interface Friend {
  friendshipId: string;
  userId: string;
  userName: string;
}

export default function TransferTicketPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ticketId = searchParams.get('ticketId');
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<string>(ticketId || '');
  const [selectedFriend, setSelectedFriend] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch user tickets
  const fetchTickets = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const accessToken = localStorage.getItem('accessToken') || '';
      
      const response = await fetch(`/api/users/${user.userId}/tickets`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-user-id': user.userId
        }
      });

      if (!response.ok) {
        throw new Error('無法獲取票券');
      }

      const data = await response.json();
      // Filter only available tickets that can be transferred
      const availableTickets = Array.isArray(data) ? data.filter((ticket: Ticket) => 
        ticket.status === 'available' || ticket.status === 'sold'
      ) : [];
      
      setTickets(availableTickets);
      
      // If we have a ticketId in query params and it's valid, select it
      if (ticketId) {
        const validTicket = availableTickets.find(t => t.ticketId === ticketId);
        if (validTicket) {
          setSelectedTicket(ticketId);
        }
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError(err instanceof Error ? err.message : '無法獲取票券');
    } finally {
      setLoading(false);
    }
  }, [user, ticketId]);

  // Fetch user friends
  const fetchFriends = useCallback(async () => {
    if (!user) return;
    
    try {
      const accessToken = localStorage.getItem('accessToken') || '';
      
      const response = await fetch('/api/friends', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-user-id': user.userId
        }
      });

      if (!response.ok) {
        throw new Error('無法獲取好友列表');
      }

      const data = await response.json();
      setFriends(data.friendships || []);
    } catch (err) {
      console.error('Error fetching friends:', err);
      setError(err instanceof Error ? err.message : '無法獲取好友列表');
    }
  }, [user]);

  useEffect(() => {
    // Check authentication first
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent('/user/tickets/transfer')}`);
      return;
    }

    if (isAuthenticated && user) {
      fetchTickets();
      fetchFriends();
    }
  }, [isAuthenticated, authLoading, user, router, fetchTickets, fetchFriends]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTicket || !selectedFriend) {
      setError('請選擇票券和接收的好友');
      return;
    }
    
    setProcessing(true);
    setError(null);
    
    try {
      const accessToken = localStorage.getItem('accessToken') || '';
      
      const response = await fetch('/api/tickets/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-user-id': user?.userId || ''
        },
        body: JSON.stringify({
          ticketId: selectedTicket,
          recipientId: selectedFriend
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '轉贈票券失敗');
      }
      
      setSuccess('票券轉贈成功！');
      
      // Refresh the ticket list
      fetchTickets();
      
      // Clear the form
      setSelectedTicket('');
      setSelectedFriend('');
      
      // Redirect after success
      setTimeout(() => {
        router.push('/user/order');
      }, 2000);
    } catch (err) {
      console.error('Error transferring ticket:', err);
      setError(err instanceof Error ? err.message : '轉贈票券失敗');
    } finally {
      setProcessing(false);
    }
  };

  if (authLoading) {
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
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">轉贈票券</h1>
          
          {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />}
          {success && <Alert type="success" message={success} className="mb-4" />}
          
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="medium" />
            </div>
          ) : (
            <>
              {tickets.length === 0 ? (
                <div className="bg-white p-6 rounded-lg shadow text-center">
                  <p className="text-gray-600 mb-4">您沒有可轉贈的票券</p>
                  <button
                    onClick={() => router.push('/user/order')}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
                  >
                    返回票券列表
                  </button>
                </div>
              ) : (
                <form onSubmit={handleTransfer} className="bg-white p-6 rounded-lg shadow-md">
                  <div className="mb-6">
                    <label htmlFor="ticket" className="block text-sm font-medium text-gray-700 mb-2">
                      選擇票券
                    </label>
                    <select
                      id="ticket"
                      value={selectedTicket}
                      onChange={(e) => setSelectedTicket(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="">請選擇票券</option>
                      {tickets.map((ticket) => (
                        <option key={ticket.ticketId} value={ticket.ticketId}>
                          {ticket.eventName} - {ticket.zone}區 - {new Date(ticket.eventDate).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="mb-6">
                    <label htmlFor="friend" className="block text-sm font-medium text-gray-700 mb-2">
                      選擇好友
                    </label>
                    {friends.length === 0 ? (
                      <div className="p-4 bg-yellow-50 rounded-md">
                        <p className="text-yellow-700">您目前沒有好友。請先新增好友才能轉贈票券。</p>
                        <button
                          type="button"
                          onClick={() => router.push('/user/friends')}
                          className="mt-2 text-blue-600 hover:underline"
                        >
                          前往新增好友
                        </button>
                      </div>
                    ) : (
                      <select
                        id="friend"
                        value={selectedFriend}
                        onChange={(e) => setSelectedFriend(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-md"
                        required
                      >
                        <option value="">請選擇好友</option>
                        {friends.map((friend) => (
                          <option key={friend.friendshipId} value={friend.userId}>
                            {friend.userName}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => router.push('/user/order')}
                      className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded"
                    >
                      返回
                    </button>
                    <button
                      type="submit"
                      disabled={processing || !selectedTicket || !selectedFriend || friends.length === 0}
                      className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded disabled:opacity-50"
                    >
                      {processing ? <LoadingSpinner size="small" /> : '確認轉贈'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
