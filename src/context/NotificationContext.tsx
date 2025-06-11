'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';

export interface Notification {
  id: string;
  type: 'lottery' | 'system' | 'payment';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
  eventId?: string;
  registrationToken?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, user } = useAuth();
  
  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !user?.userId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/notifications/lottery', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
          'x-user-id': user.userId 
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.userId]);

  const markAsRead = useCallback(async (id: string) => {
    if (!isAuthenticated || !user?.userId) return;
    
    try {
      const response = await fetch('/api/notifications/lottery/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
          'x-user-id': user.userId
        },
        body: JSON.stringify({ notificationId: id })
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id ? { ...notification, read: true } : notification
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, [isAuthenticated, user?.userId]);

  const markAllAsRead = useCallback(async () => {
    if (!isAuthenticated || !user?.userId || notifications.length === 0) return;
    
    try {
      const response = await fetch('/api/notifications/lottery/read-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
          'x-user-id': user.userId
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, [isAuthenticated, user?.userId, notifications]);

  // Fetch notifications when auth state changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated, fetchNotifications]);

  // Poll for new notifications every 2 minutes
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const intervalId = setInterval(() => {
      fetchNotifications();
    }, 2 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [isAuthenticated, fetchNotifications]);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  }), [notifications, unreadCount, loading, error, fetchNotifications, markAsRead, markAllAsRead]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
