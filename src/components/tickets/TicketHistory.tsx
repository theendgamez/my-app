import { useState, useEffect } from 'react';
import LoadingSpinner from '../ui/LoadingSpinner';
import { Ticket } from '@/types';

interface TicketTransaction {
  ticketId: string;
  timestamp: number;
  action: 'create' | 'transfer' | 'use' | 'verify' | 'cancel';
  fromUserId?: string;
  toUserId?: string;
  fromUser?: string | { userId: string; name: string };
  toUser?: string | { userId: string; name: string };
  eventId: string;
  signature?: string;
}

interface TicketHistoryProps {
  ticketId: string;
  isAdminView?: boolean;
  emptyMessage?: string;
}

export default function TicketHistory({ ticketId, isAdminView = false, emptyMessage = "無可用的交易歷史記錄" }: TicketHistoryProps) {
  const [history, setHistory] = useState<TicketTransaction[]>([]);
  const [, setTicketDetails] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch ticket details first to check if it has transfer information
  useEffect(() => {
    async function fetchTicketDetails() {
      if (!ticketId) return;
      
      try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`/api/tickets/${ticketId}`, {
          headers: {
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setTicketDetails(data);
        }
      } catch (err) {
        console.error('Error fetching ticket details:', err);
      }
    }
    
    fetchTicketDetails();
  }, [ticketId]);

  // Now fetch history
  useEffect(() => {
    async function fetchTicketHistory() {
      try {
        setLoading(true);
        const accessToken = localStorage.getItem('accessToken');
        
        const response = await fetch(`/api/tickets/${ticketId}/history`, {
          headers: {
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
          }
        });

        if (!response.ok) {
          throw new Error(`獲取交易歷史失敗: ${response.status}`);
        }

        const data = await response.json();
        const transactions = Array.isArray(data) ? data : 
                         data.history && Array.isArray(data.history) ? data.history : [];
        
        setHistory(transactions);
        setError(null);
      } catch (err) {
        console.error('Error fetching ticket history:', err);
        setError(err instanceof Error ? err.message : '獲取交易歷史時出錯');
      } finally {
        setLoading(false);
      }
    }

    if (ticketId) {
      fetchTicketHistory();
    }
  }, [ticketId]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-HK', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  // Helper function to extract name from user objects or use string directly
  const getUserName = (user: string | { userId: string; name: string } | undefined | null): string => {
    if (!user) return '未知';
    if (typeof user === 'string') return user;
    return user.name || '未知';
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'create': return '創建票券';
      case 'transfer': return '轉讓票券';
      case 'use': return '使用票券';
      case 'verify': return '驗證票券';
      case 'cancel': return '取消票券';
      default: return action;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-4">
        <LoadingSpinner size="small" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 text-red-700 p-3 rounded-md text-sm">
        {error}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 p-4 rounded-md text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-gray-600 text-sm">{emptyMessage}</p>
        <p className="text-xs text-gray-500 mt-2">
          所有後續的票券交易將自動記錄到區塊鏈上，確保交易歷史不可篡改。
        </p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">時間</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              {isAdminView && (
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">交易哈希</th>
              )}
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">詳情</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {history.map((transaction, index) => (
              <tr key={index}>
                <td className="px-4 py-3 text-xs text-gray-900">
                  {formatDate(transaction.timestamp)}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    transaction.action === 'create' ? 'bg-green-100 text-green-800' :
                    transaction.action === 'transfer' ? 'bg-blue-100 text-blue-800' :
                    transaction.action === 'use' ? 'bg-purple-100 text-purple-800' :
                    transaction.action === 'verify' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {getActionText(transaction.action)}
                  </span>
                </td>
                {isAdminView && (
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                    {transaction.signature?.substring(0, 8)}...{transaction.signature?.substring(transaction.signature.length - 8)}
                  </td>
                )}
                <td className="px-4 py-3 text-xs text-gray-500">
                  {transaction.action === 'transfer' ? (
                    <span>
                      從 <span className="font-medium">{getUserName(transaction.fromUser)}</span> 
                      轉讓給 <span className="font-medium">{getUserName(transaction.toUser)}</span>
                    </span>
                  ) : transaction.action === 'verify' ? (
                    <span>票券驗證生成新的QR碼</span>
                  ) : (
                    <span>{getUserName(transaction.fromUser) || getUserName(transaction.toUser) || '-'}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
