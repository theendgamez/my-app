"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/navbar/Navbar';
import Link from 'next/link';
import { Ticket } from '@/types';
import { formatDate } from '@/utils/formatters';

export default function Dashboard() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [upcomingEvents, setUpcomingEvents] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's upcoming events/tickets
  useEffect(() => {
    // Redirect if not authenticated
    if (!loading && !isAuthenticated) {
      router.push('/login?redirect=/user/dashboard');
      return;
    }

    // Fetch user tickets if authenticated
    if (isAuthenticated && user) {
      const fetchUserTickets = async () => {
        try {
          setTicketsLoading(true);
          const accessToken = localStorage.getItem('accessToken');

          const response = await fetch(`/api/users/${user.userId}/tickets`, {
            headers: {
              'Content-Type': 'application/json',
              ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
              'x-user-id': user.userId
            }
          });

          if (!response.ok) {
            throw new Error('Failed to fetch tickets');
          }

          const tickets = await response.json();
          
          // Filter for upcoming events only (event date in the future)
          const now = new Date();
          const upcoming = tickets.filter((ticket: Ticket) => {
            if (!ticket.eventDate) return false;
            const eventDate = new Date(ticket.eventDate);
            return eventDate > now && ticket.status !== 'used';
          });

          setUpcomingEvents(upcoming);
        } catch (err) {
          console.error('Error fetching tickets:', err);
          setError('Failed to load your tickets. Please try again later.');
        } finally {
          setTicketsLoading(false);
        }
      };

      fetchUserTickets();
    }
  }, [isAuthenticated, loading, user, router]);

  return (
    <div>
      <Navbar />
      <main className="p-4 pt-20">
        <div className="max-w-6xl mx-auto">
          {/* Welcome section */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-lg mb-6">
            <h1 className="text-2xl font-bold mb-2">
              {loading ? '載入中...' : `歡迎, ${user?.userName || '用戶'}`}
            </h1>
            <p className="opacity-90">查看您的票券、訂單和個人資料</p>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Link href="/user/order" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
              <h2 className="text-lg font-semibold mb-2">我的票券</h2>
              <p className="text-gray-600 text-sm">查看您所有的票券和訂單</p>
            </Link>
            <Link href="/user/profile" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
              <h2 className="text-lg font-semibold mb-2">個人資料</h2>
              <p className="text-gray-600 text-sm">更新您的個人信息和密碼</p>
            </Link>
            <Link href="/events" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
              <h2 className="text-lg font-semibold mb-2">瀏覽活動</h2>
              <p className="text-gray-600 text-sm">發現更多精彩活動</p>
            </Link>
          </div>

          {/* Upcoming events section */}
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-semibold mb-4">即將到來的活動</h2>
            
            {ticketsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="text-red-500 p-4 bg-red-50 rounded">{error}</div>
            ) : upcomingEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingEvents.map((ticket) => (
                  <Link 
                    href={`/user/order/${ticket.ticketId}`} 
                    key={ticket.ticketId}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <h3 className="font-semibold text-lg truncate">{ticket.eventName}</h3>
                    <p className="text-gray-600 text-sm mb-2">
                      {ticket.eventDate ? formatDate(ticket.eventDate) : '日期未定'}
                    </p>
                    <p className="text-sm">{ticket.zone || '一般入場'}</p>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                        {ticket.status === 'sold' ? '已購買' : ticket.status}
                      </span>
                      <span className="text-sm text-blue-500">查看詳情 →</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>您沒有即將到來的活動</p>
                <Link href="/events" className="text-blue-500 hover:underline block mt-2">
                  瀏覽可用活動
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
