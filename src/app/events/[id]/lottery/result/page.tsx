'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/navbar/Navbar';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import QRCodeDisplay from '@/components/tickets/QRCodeDisplay';
import { Ticket } from '@/types';

export default function LotteryResultPage() {
  const router = useRouter();
  const { id } = useParams();
  const searchParams = useSearchParams();
  const registrationToken = searchParams.get('registrationToken');
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check authentication first
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (!registrationToken) {
      setError('缺少抽籤登記令牌');
      setLoading(false);
      return;
    }
    
    // Fetch tickets for this lottery registration
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/lottery/registration/${registrationToken}/tickets`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
            'x-user-id': user?.userId || ''
          }
        });

        if (!response.ok) {
          throw new Error('無法獲取票券詳情');
        }

        const data = await response.json();
        setTickets(data.tickets || []);
      } catch (err) {
        console.error('Error fetching tickets:', err);
        setError(err instanceof Error ? err.message : '無法獲取票券詳情');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && registrationToken) {
      fetchTickets();
    }
  }, [id, registrationToken, isAuthenticated, authLoading, router, user]);

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

  if (error) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto p-4 pt-20">
          <Alert type="error" title="錯誤" message={error} />
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => router.push('/user/lottery')}
              className="px-6 py-2 rounded bg-gray-200 hover:bg-gray-300"
            >
              返回抽籤記錄
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4 pt-20">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">抽籤結果</h1>
            <button
              onClick={() => router.push('/user/lottery')}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
            >
              返回抽籤記錄
            </button>
          </div>
          
          {tickets.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <p className="text-gray-600 mb-4">找不到相關票券</p>
              <button
                onClick={() => router.push('/user/lottery')}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                返回抽籤記錄
              </button>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-4">恭喜您已中籤！</h2>
                <p className="text-gray-600">
                  您已成功獲得以下票券，請妥善保管您的電子票券。
                </p>
              </div>
              
              <div className="space-y-6">
                {tickets.map(ticket => (
                  <div key={ticket.ticketId} className="border p-4 rounded-lg">
                    <div className="flex flex-col md:flex-row gap-6 items-center">
                      <div className="flex-1 space-y-2">
                        <h3 className="font-semibold text-lg">{ticket.eventName}</h3>
                        <p className="text-gray-600">
                          {ticket.eventDate ? new Date(ticket.eventDate).toLocaleString() : 'Date unavailable'}
                        </p>
                        <p className="text-gray-600">
                          {ticket.eventLocation}
                        </p>
                        <div className="mt-2">
                          <p className="text-sm">
                            <span className="font-medium">區域:</span> {ticket.zone}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">座位:</span> {ticket.seatNumber}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0">
                        <QRCodeDisplay 
                          qrCode={ticket.qrCode}
                          ticketId={ticket.ticketId}
                          size={150}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
