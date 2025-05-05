"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface LotteryResult {
  registrationToken: string;
  eventName: string;
  result: 'won' | 'lost';
}

export default function LotteryNotification() {
  const [notifications, setNotifications] = useState<LotteryResult[]>([]);
  const [visible, setVisible] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const checkLotteryResults = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/lottery', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
          'x-user-id': user?.userId || ''
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          setNotifications(data.results);
          setVisible(true);
        }
      }
    } catch (err) {
      console.error('Error checking lottery notifications:', err);
      router.push('/user/order');
    }
  }, [user, router]);

  useEffect(() => {
    if (user?.userId) {
      checkLotteryResults();
    }
  }, [user, checkLotteryResults]);

  useEffect(() => {
    // Only check notifications if user is authenticated
    if (!isAuthenticated || !user) return;

    // Check for notifications when component mounts
    checkLotteryResults();

    // Check periodically
    const interval = setInterval(checkLotteryResults, 5 * 60 * 1000); // every 5 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated, user, checkLotteryResults]);

  const handleClose = () => {
    setVisible(false);
  };

  const handleViewResult = (registrationToken: string) => {
    // Mark as read and redirect to details page
    fetch('/api/notifications/lottery/read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
        'x-user-id': user?.userId || ''
      },
      body: JSON.stringify({ registrationToken })
    }).then(() => {
      // Remove this notification
      setNotifications(prev => prev.filter(n => n.registrationToken !== registrationToken));
      
      // Navigate to lottery result page
      router.push(`/events/lottery/result?registrationToken=${registrationToken}`);
    }).catch(() => {
      router.push('/user/order');
    });
  };

  if (!visible || notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md w-full">
      {notifications.map((notification, index) => (
        <div 
          key={notification.registrationToken}
          className={`bg-white shadow-lg rounded-lg p-4 mb-2 border-l-4 ${
            notification.result === 'won' ? 'border-green-500' : 'border-gray-500'
          } transform transition-all duration-300`}
          style={{ 
            opacity: 1, 
            transform: `translateY(${-index * 10}px)`
          }}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">
                抽籤結果 - {notification.eventName}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {notification.result === 'won' 
                  ? '恭喜您已中籤！請查看詳情以完成購票。' 
                  : '很抱歉，您未能中籤。謝謝您的參與。'}
              </p>
              <button 
                onClick={() => handleViewResult(notification.registrationToken)}
                className={`mt-2 px-3 py-1 text-sm rounded ${
                  notification.result === 'won' 
                    ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                查看詳情
              </button>
            </div>
            <button 
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
