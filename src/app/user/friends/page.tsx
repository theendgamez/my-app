'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navbar/Navbar';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import FriendRequestForm from '@/components/friends/FriendRequestForm';
import PendingRequestsList from '@/components/friends/PendingRequestsList';
import FriendsList from '@/components/friends/FriendsList';

export default function FriendsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' 或 'requests'

  // 獲取好友列表
  const fetchFriends = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/friends', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
          'x-user-id': user?.userId || ''
        }
      });

      if (!response.ok) {
        throw new Error('獲取好友列表失敗');
      }

      const data = await response.json();
      setFriends(data.friendships || []);
    } catch (err) {
      console.error('Error fetching friends:', err);
      setError(err instanceof Error ? err.message : '無法獲取好友列表');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 獲取待處理的好友請求
  const fetchPendingRequests = useCallback(async () => {
    try {
      const response = await fetch('/api/friends/pending', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
          'x-user-id': user?.userId || ''
        }
      });

      if (!response.ok) {
        throw new Error('獲取好友請求失敗');
      }

      const data = await response.json();
      setPendingRequests(data.pendingRequests || []);
    } catch (err) {
      console.error('Error fetching pending requests:', err);
    }
  }, [user]);

  // 處理發送好友請求
  const handleSendRequest = async (recipientEmail: string) => {
    try {
      // 獲取用戶ID
      const userResponse = await fetch(`/api/users/find?email=${encodeURIComponent(recipientEmail)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
          'x-user-id': user?.userId || ''
        }
      });

      if (!userResponse.ok) {
        throw new Error('找不到該用戶');
      }

      const userData = await userResponse.json();
      const recipientId = userData.userId;

      // 發送好友請求
      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
          'x-user-id': user?.userId || ''
        },
        body: JSON.stringify({ recipientId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '發送好友請求失敗');
      }

      setSuccess('好友請求已發送');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error sending friend request:', err);
      setError(err instanceof Error ? err.message : '發送好友請求失敗');
      setTimeout(() => setError(null), 3000);
    }
  };

  // 處理接受好友請求
  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      const response = await fetch('/api/friends/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
          'x-user-id': user?.userId || ''
        },
        body: JSON.stringify({ friendshipId })
      });

      if (!response.ok) {
        throw new Error('接受好友請求失敗');
      }

      setSuccess('已接受好友請求');
      setTimeout(() => setSuccess(null), 3000);
      
      // 重新獲取數據
      fetchPendingRequests();
      fetchFriends();
    } catch (err) {
      console.error('Error accepting friend request:', err);
      setError(err instanceof Error ? err.message : '接受好友請求失敗');
      setTimeout(() => setError(null), 3000);
    }
  };

  // 處理拒絕好友請求
  const handleRejectRequest = async (friendshipId: string) => {
    try {
      const response = await fetch('/api/friends/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
          'x-user-id': user?.userId || ''
        },
        body: JSON.stringify({ friendshipId })
      });

      if (!response.ok) {
        throw new Error('拒絕好友請求失敗');
      }

      setSuccess('已拒絕好友請求');
      setTimeout(() => setSuccess(null), 3000);
      
      // 重新獲取數據
      fetchPendingRequests();
    } catch (err) {
      console.error('Error rejecting friend request:', err);
      setError(err instanceof Error ? err.message : '拒絕好友請求失敗');
      setTimeout(() => setError(null), 3000);
    }
  };

  // 處理刪除好友
  const handleRemoveFriend = async (friendshipId: string) => {
    if (!window.confirm('確定要刪除此好友嗎？')) return;
    
    try {
      const response = await fetch('/api/friends/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
          'x-user-id': user?.userId || ''
        },
        body: JSON.stringify({ friendshipId })
      });

      if (!response.ok) {
        throw new Error('刪除好友失敗');
      }

      setSuccess('已刪除好友');
      setTimeout(() => setSuccess(null), 3000);
      
      // 重新獲取數據
      fetchFriends();
    } catch (err) {
      console.error('Error removing friend:', err);
      setError(err instanceof Error ? err.message : '刪除好友失敗');
      setTimeout(() => setError(null), 3000);
    }
  };

  useEffect(() => {
    // 檢查用戶是否已登入
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/user/friends');
      return;
    }

    if (isAuthenticated && user) {
      fetchFriends();
      fetchPendingRequests();
    }
  }, [isAuthenticated, authLoading, user, router, fetchFriends, fetchPendingRequests]);

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
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">我的好友</h1>
          
          {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />}
          {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} className="mb-4" />}
          
          <div className="mb-8">
            <FriendRequestForm onSendRequest={handleSendRequest} />
          </div>
          
          <div className="mb-4">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('friends')}
                  className={`${
                    activeTab === 'friends'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium`}
                >
                  好友列表
                  {friends.length > 0 && <span className="ml-2 bg-gray-100 text-gray-700 py-0.5 px-2 rounded-full text-xs">{friends.length}</span>}
                </button>
                <button
                  onClick={() => setActiveTab('requests')}
                  className={`${
                    activeTab === 'requests'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium`}
                >
                  好友請求
                  {pendingRequests.length > 0 && <span className="ml-2 bg-red-100 text-red-700 py-0.5 px-2 rounded-full text-xs">{pendingRequests.length}</span>}
                </button>
              </nav>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="medium" />
            </div>
          ) : (
            <div>
              {activeTab === 'friends' ? (
                <FriendsList 
                  friends={friends}
                  onRemoveFriend={handleRemoveFriend}
                />
              ) : (
                <PendingRequestsList 
                  pendingRequests={pendingRequests}
                  onAcceptRequest={handleAcceptRequest}
                  onRejectRequest={handleRejectRequest}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
