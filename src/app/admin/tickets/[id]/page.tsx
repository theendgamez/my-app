"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminPage from '@/components/admin/AdminPage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/context/AuthContext';
import QRCodeDisplay from '@/components/tickets/QRCodeDisplay';
import TicketHistory from '@/components/tickets/TicketHistory';
import { Ticket } from '@/types';
// Define proper ticket type

export default function AdminTicketDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  // We are using loading from auth, but can remove isAdmin since we're not using it
  const { loading: authLoading } = useAuth();
  
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHistory] = useState(false);
  
  // 獲取票券資料
  useEffect(() => {
    const fetchTicket = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const accessToken = localStorage.getItem('accessToken') || '';
        const userId = localStorage.getItem('userId') || '';
        
        const response = await fetch(`/api/tickets/${id}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'x-user-id': userId
          }
        });
        
        if (!response.ok) {
          throw new Error(`無法獲取票券資料: ${response.status}`);
        }
        
        const data = await response.json();
        setTicket(data);
      } catch (err) {
        console.error('Error fetching ticket:', err);
        setError(err instanceof Error ? err.message : '無法獲取票券資料');
      } finally {
        setLoading(false);
      }
    };
    
    if (!authLoading) {
      fetchTicket();
    }
  }, [id, authLoading]);
  
  // 返回票券列表
  const goBack = () => {
    router.push('/admin/tickets');
  };

  return (
    <AdminPage title="票券詳情" isLoading={authLoading}>
      <div className="bg-white rounded-lg shadow p-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="large" />
          </div>
        ) : error ? (
          <div className="text-center">
            <Alert type="error" message={error} />
            <button onClick={goBack} className="mt-4 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded">
              返回票券列表
            </button>
          </div>
        ) : ticket ? (
          <div>
            <div className="mb-6 flex justify-between items-start">
              <h2 className="text-xl font-bold">票券詳情</h2>
              
              <div className="flex space-x-2">
                <Link 
                  href={`/admin/tickets/verify/${ticket.ticketId}`}
                  className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm"
                >
                  檢票操作
                </Link>
                
                <button 
                  onClick={goBack}
                  className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                >
                  返回列表
                </button>
              </div>
            </div>
            
            {/* 顯示QR碼和驗證連結 */}
            <div className="mb-8 flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-shrink-0">
                <div className="bg-white p-2 border rounded-lg shadow-sm">
                  <QRCodeDisplay 
                    qrCode={ticket.qrCode} 
                    ticketId={ticket.ticketId}
                    size={200}
                  />
                </div>
                <div className="text-center mt-2 text-sm text-gray-500">
                  票券QR碼
                </div>
              </div>
              
              <div className="flex-grow">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h3 className="font-medium text-blue-800 mb-3">快速驗證連結</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Link 
                        href={`/admin/tickets/verify/${ticket.ticketId}`}
                        className="block w-full py-2 px-3 bg-blue-500 hover:bg-blue-600 text-white text-center rounded"
                      >
                        前往檢票頁面
                      </Link>
                      <p className="text-xs text-gray-500 mt-1">使用管理員權限檢票</p>
                    </div>
                    
                    <div>
                      <button 
                        onClick={() => {
                          const url = `${window.location.origin}/admin/tickets/verify/${ticket.ticketId}?source=share&token=${Date.now()}`;
                          navigator.clipboard.writeText(url);
                          alert('驗證連結已複製到剪貼板！');
                        }}
                        className="block w-full py-2 px-3 bg-gray-200 hover:bg-gray-300 text-gray-800 text-center rounded"
                      >
                        複製驗證連結
                      </button>
                      <p className="text-xs text-gray-500 mt-1">可分享給其他檢票人員使用</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 顯示票券歷史 */}
            {showHistory && (
              <div className="mt-6">
                <TicketHistory ticketId={ticket.ticketId} isAdminView={true} />
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">找不到票券資料</p>
            <button onClick={goBack} className="mt-4 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded">
              返回票券列表
            </button>
          </div>
        )}
      </div>
    </AdminPage>
  );
}
