"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import AdminPage from '@/components/admin/AdminPage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/context/AuthContext';
import { Ticket } from '@/types';

export default function AdminTicketVerifyPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Using these variables in the UI behavior based on query params
  const token = searchParams.get('token');
  const source = searchParams.get('source');
  const shouldRedirect = searchParams.get('redirect') === 'true';
  
  // We need the loading state from auth, can ignore isAdmin since AdminPage handles that
  const { loading: authLoading } = useAuth();
  const [ticket, setTicket] = useState<Ticket| null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Wrap markAsUsed with useCallback to maintain stable function reference
  const markAsUsed = useCallback(async () => {
    if (!id || verifying) return;
    
    try {
      setVerifying(true);
      setError(null);
      
      const accessToken = localStorage.getItem('accessToken') || '';
      const userId = localStorage.getItem('userId') || '';
      
      const response = await fetch(`/api/admin/tickets/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-user-id': userId
        },
        body: JSON.stringify({ status: 'used' })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `操作失敗: ${response.status}`);
      }
      
      // 更新成功
      setSuccess('票券已成功標記為已使用！');
      
      // 重新獲取票券信息
      const updatedTicketResponse = await fetch(`/api/tickets/${id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-user-id': userId,
          'x-ticket-checker': 'true'
        }
      });
      
      if (updatedTicketResponse.ok) {
        const updatedTicket = await updatedTicketResponse.json();
        setTicket(updatedTicket);
      }
    } catch (err) {
      console.error('Error marking ticket as used:', err);
      setError(err instanceof Error ? err.message : '標記票券為已使用時發生錯誤');
    } finally {
      setVerifying(false);
    }
  }, [id, verifying, setVerifying, setError, setSuccess, setTicket]);

  // 獲取票券資料
  useEffect(() => {
    const fetchTicket = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const accessToken = localStorage.getItem('accessToken') || '';
        const userId = localStorage.getItem('userId') || '';
        
        // Add optional token and source from query parameters to the request
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-user-id': userId,
          'x-ticket-checker': 'true'
        };
        
        // If we have a verification token, add it to the headers
        if (token) {
          headers['x-verification-token'] = token;
        }
        
        // If we have a source parameter, handle it accordingly
        const sourceParam = source ? `&source=${source}` : '';
        
        const response = await fetch(`/api/tickets/${id}?verifying=true${sourceParam}`, {
          headers
        });
        
        if (!response.ok) {
          throw new Error(`無法獲取票券資料: ${response.status}`);
        }
        
        const data = await response.json();
        setTicket(data);
        
        // Implement auto-redirect if requested via query parameter
        if (shouldRedirect && data.status === 'sold') {
          // Auto-mark as used if redirect parameter is true
          markAsUsed();
        }
        
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
  }, [id, authLoading, token, source, shouldRedirect, markAsUsed]);
  
  // 取消票券
  const cancelTicket = async () => {
    if (!id || verifying) return;
    
    if (!window.confirm('確定要取消此票券？此操作無法撤銷。')) {
      return;
    }
    
    try {
      setVerifying(true);
      setError(null);
      
      const accessToken = localStorage.getItem('accessToken') || '';
      const userId = localStorage.getItem('userId') || '';
      
      const response = await fetch(`/api/admin/tickets/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-user-id': userId
        },
        body: JSON.stringify({ status: 'cancelled' })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `操作失敗: ${response.status}`);
      }
      
      // 更新成功
      setSuccess('票券已成功取消！');
      
      // 重新獲取票券信息
      const updatedTicketResponse = await fetch(`/api/tickets/${id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-user-id': userId,
          'x-ticket-checker': 'true'
        }
      });
      
      if (updatedTicketResponse.ok) {
        const updatedTicket = await updatedTicketResponse.json();
        setTicket(updatedTicket);
      }
    } catch (err) {
      console.error('Error cancelling ticket:', err);
      setError(err instanceof Error ? err.message : '取消票券時發生錯誤');
    } finally {
      setVerifying(false);
    }
  };

  // 返回票券列表
  const goBack = () => {
    router.push('/admin/tickets');
  };

  return (
    <AdminPage title="票券驗證" isLoading={authLoading}>
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
            {success && <Alert type="success" message={success} className="mb-6" />}
            
            <div className="mb-6 flex justify-between items-start">
              <h2 className="text-xl font-bold">票券詳情</h2>
              
              <div className="flex space-x-2">
                <button 
                  onClick={goBack}
                  className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                >
                  返回列表
                </button>
                
                <button 
                  onClick={() => router.push(`/admin/tickets/${id}`)}
                  className="px-3 py-1 bg-blue-100 hover:bg-blue-200 rounded text-sm text-blue-800"
                >
                  詳細資料
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">狀態</p>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                      ${ticket.status === 'available' || ticket.status === 'sold' ? 'bg-green-100 text-green-800' :
                        ticket.status === 'used' ? 'bg-blue-100 text-blue-800' : 
                        'bg-red-100 text-red-800'}`}>
                      {ticket.status === 'available' ? '可用' :
                       ticket.status === 'sold' ? '已售出' :
                       ticket.status === 'used' ? '已使用' : '已取消'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">票券ID</p>
                  <p className="font-medium">{ticket.ticketId}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">活動名稱</p>
                  <p className="font-medium">{ticket.eventName}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">活動日期</p>
                  <p className="font-medium">{ticket.formattedEventDate}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">活動地點</p>
                  <p className="font-medium">{ticket.eventLocation}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">區域</p>
                  <p className="font-medium">{ticket.zone}</p>
                </div>
                
                {ticket.seatNumber && (
                  <div>
                    <p className="text-sm text-gray-500">座位號碼</p>
                    <p className="font-medium">{ticket.seatNumber}</p>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">持有者</p>
                  <p className="font-medium">{ticket.userRealName}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">用戶ID</p>
                  <p className="font-medium">{ticket.userId}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">購買日期</p>
                  <p className="font-medium">{ticket.formattedPurchaseDate}</p>
                </div>
                
                {ticket.verificationInfo && (
                  <div>
                    <p className="text-sm text-gray-500">驗證次數</p>
                    <p className="font-medium">{ticket.verificationInfo.verificationCount || 0}</p>
                    {ticket.verificationInfo.lastVerified && (
                      <p className="text-xs text-gray-500">上次驗證: {new Date(ticket.verificationInfo.lastVerified).toLocaleString()}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* 操作按鈕 */}
            <div className="mt-8 pt-6 border-t border-gray-200 flex flex-wrap gap-4">
              {(ticket.status === 'available' || ticket.status === 'sold') && (
                <button
                  onClick={markAsUsed}
                  disabled={verifying}
                  className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded ${verifying ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {verifying ? '處理中...' : '標記為已使用'}
                </button>
              )}
              
              {(ticket.status === 'available' || ticket.status === 'sold') && (
                <button
                  onClick={cancelTicket}
                  disabled={verifying}
                  className={`px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded ${verifying ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {verifying ? '處理中...' : '取消票券'}
                </button>
              )}
              
              <button
                onClick={goBack}
                disabled={verifying}
                className={`px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded ${verifying ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                返回票券列表
              </button>
            </div>
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
