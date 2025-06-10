'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import { Ticket } from '@/types';
import { formatDate } from '@/utils/formatters'; // Import the new formatter

// Update the Friend interface to match the actual API response structure
interface Friend {
  friendshipId: string;
  friend: {
    userId: string;
    userName: string;
    email: string;
    phoneNumber: string;
  };
  acceptedAt: string;
  friendshipDays: number;
  canTransferTickets: boolean;
}

export default function TransferTicketContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ticketId = searchParams.get('ticketId');
  const friendId = searchParams.get('friendId'); // Add this line to get friendId from URL
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<string>(ticketId || '');
  const [selectedFriend, setSelectedFriend] = useState<string>(friendId || ''); // Initialize with friendId if available
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch user tickets
  const fetchTickets = useCallback(async () => {
    if (!user) return; // Early return if user is null
    
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
      const availableTickets = Array.isArray(data) ? data.filter((ticket: Ticket) => {
        // Basic status check - only allow available or sold tickets
        const hasValidStatus = ticket.status === 'available' || ticket.status === 'sold';
        
        // Check for transfer cooldown period - only allow tickets that haven't been transferred in the last 7 days
        let passedCooldown = true;
        if (ticket.transferredAt) {
          const lastTransferDate = new Date(ticket.transferredAt);
          const now = new Date();
          const diffDays = Math.floor((now.getTime() - lastTransferDate.getTime()) / (1000 * 60 * 60 * 24));
          passedCooldown = diffDays >= 7;
        }
        
        return hasValidStatus && passedCooldown;
      }) : [];
      
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

  // Add function to calculate next transfer time
  const getNextTransferTime = (transferredAt: string) => {
    const lastTransferDate = new Date(transferredAt);
    const nextAvailableDate = new Date(lastTransferDate.getTime() + (7 * 24 * 60 * 60 * 1000)); // Add 7 days
    return formatDate(nextAvailableDate, undefined, { // Pass undefined to use default locale from formatter
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Add function to calculate remaining days
  const getRemainingDays = (transferredAt: string) => {
    const lastTransferDate = new Date(transferredAt);
    const now = new Date();
    const nextAvailableDate = new Date(lastTransferDate.getTime() + (7 * 24 * 60 * 60 * 1000));
    const diffMs = nextAvailableDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

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
      const friendsList = data.friendships || [];
      setFriends(friendsList);
      
      // Verify if the friendId from URL is valid and exists in the friends list
      if (friendId && friendsList.length > 0) {
        // Look for the friend with the matching userId in the nested friend object
        const validFriend: Friend | undefined = friendsList.find(
          (f: Friend) => f.friend && f.friend.userId === friendId
        );
        
        if (!validFriend) {
          console.warn('Friend ID from URL not found in friends list');
          // Don't reset selectedFriend here as we already initialized it
        }
      }
    } catch (err) {
      console.error('Error fetching friends:', err);
      setError(err instanceof Error ? err.message : '無法獲取好友列表');
    }
  }, [user, friendId]); // Add friendId to dependency array

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
          friendId: selectedFriend  // Ensure friendId is correctly named
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '轉贈票券失敗');
      }
      
      setSuccess('票券轉贈成功！');
      
      // Show success for a while, then redirect
      setTimeout(() => {
        router.push('/user/order');
      }, 2000);
    } catch (err) {
      console.error('Ticket transfer error:', err);
      setError(err instanceof Error ? err.message : '轉贈票券時出錯');
      setProcessing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
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
                      {ticket.eventName} - {ticket.zone}區 - {ticket.eventDate ? new Date(ticket.eventDate).toLocaleDateString() : '未知日期'}
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
                      <option key={friend.friendshipId} value={friend.friend.userId}>
                        {friend.friend.userName}
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
      
      {/* Add cooldown information section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <h3 className="font-semibold text-blue-800 mb-2">轉讓規則說明</h3>
        <div className="text-blue-700 space-y-2">
          <p>• 每張票券轉讓後需要等待 7 天才能再次轉讓</p>
          <p>• 轉讓後票券擁有權將立即轉移給接收者</p>
          <p>• 請確認接收者資訊正確，轉讓完成後無法撤銷</p>
          
          {/* Show next transfer times for recently transferred tickets */}
          {tickets.some(ticket => ticket.transferredAt && getRemainingDays(ticket.transferredAt) > 0) && (
            <div className="mt-4 p-3 bg-white rounded border">
              <h4 className="font-medium text-blue-800 mb-2">冷卻期票券</h4>
              {tickets
                .filter(ticket => ticket.transferredAt && getRemainingDays(ticket.transferredAt) > 0)
                .map(ticket => (
                  <div key={ticket.ticketId} className="text-sm space-y-1 mb-2 last:mb-0">
                    <p className="font-medium">{ticket.eventName}</p>
                    <p className="text-blue-600">
                      下次可轉讓時間：{getNextTransferTime(ticket.transferredAt!)}
                    </p>
                    <p className="text-blue-500">
                      剩餘 {getRemainingDays(ticket.transferredAt!)} 天
                    </p>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
