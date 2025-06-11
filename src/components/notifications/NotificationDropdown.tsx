'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { FiBell } from 'react-icons/fi';
import { useNotifications } from '@/context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { enUS, zhHK } from 'date-fns/locale'; // Import enUS as well
import { useTranslations } from '@/hooks/useTranslations'; // Import useTranslations
import type { Locale as DateFnsLocaleType } from 'date-fns'; // Import Locale type for date-fns

const dateFnsLocales: Record<string, DateFnsLocaleType> = {
  en: enUS,
  zh: zhHK,
};

const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications } = useNotifications();
  const { t, locale: appLocale } = useTranslations(); // Use useTranslations

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Format date in Chinese
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: dateFnsLocales[appLocale] || enUS, // Use dynamic locale
      });
    } catch {
      return t('unknownTime'); // Use translated string
    }
  };

  const handleNotificationClick = (notificationId: string) => {
    markAsRead(notificationId);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    if (!isOpen) {
      fetchNotifications(); // Refresh notifications when opening the dropdown
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        className="relative text-slate-700 hover:text-slate-900 transition-colors"
        onClick={toggleDropdown}
      >
        <FiBell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-10 ring-1 ring-black ring-opacity-5 max-h-96 overflow-y-auto">
          <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-sm font-semibold">{t('notifications')}</h3>
            {unreadCount > 0 && (
              <button 
                onClick={() => markAllAsRead()}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                {t('markAllAsRead')}
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p>{t('noNotifications')}</p>
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`px-4 py-3 hover:bg-gray-50 border-b border-gray-100 ${!notification.read ? 'bg-blue-50' : ''}`}
                >
                  {notification.link ? (
                    <Link href={notification.link} onClick={() => handleNotificationClick(notification.id)}>
                      <div className="mb-1">
                        <p className="text-sm font-medium">{notification.title}</p>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">{notification.message}</p>
                      <p className="text-xs text-gray-400">{formatDate(notification.createdAt)}</p>
                    </Link>
                  ) : (
                    <div onClick={() => markAsRead(notification.id)}>
                      <div className="mb-1">
                        <p className="text-sm font-medium">{notification.title}</p>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">{notification.message}</p>
                      <p className="text-xs text-gray-400">{formatDate(notification.createdAt)}</p>
                    </div>
                  )}
                </div>
              ))}

              <div className="px-4 py-2 text-center">
                <button 
                  onClick={() => {
                    // TODO: Navigate to all notifications page
                    setIsOpen(false);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {t('viewAllNotifications')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
