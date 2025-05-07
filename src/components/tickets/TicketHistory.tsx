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
  const [ticketDetails, setTicketDetails] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingBlockchain, setSyncingBlockchain] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

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
  }, [ticketId, syncSuccess]);

  // Sync missing blockchain records if needed
  const syncBlockchainRecords = async () => {
    if (!ticketId || !ticketDetails?.transferredAt) return;
    
    try {
      setSyncingBlockchain(true);
      setError(null);
      
      const accessToken = localStorage.getItem('accessToken');
      
      const response = await fetch(`/api/tickets/${ticketId}/sync-blockchain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        }
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || '同步區塊鏈記錄失敗');
      }
      
      if (result.synced) {
        setSyncSuccess(true);
        // Wait a moment and then refresh history
        setTimeout(() => {
          setHistory([]); // Clear current history to trigger reload
        }, 500);
      } else {
        setError(result.message || '沒有可同步的交易');
      }
    } catch (err) {
      console.error('Error syncing blockchain records:', err);
      setError(err instanceof Error ? err.message : '同步記錄時出錯');
    } finally {
      setSyncingBlockchain(false);
    }
  };

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

  // Show transfer information if no blockchain history but ticket has transfer data
  if (history.length === 0 && ticketDetails?.transferredAt) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
        <div className="flex items-center mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium text-yellow-700">票券已轉贈，但尚未記錄到區塊鏈</span>
        </div>
        <p className="text-sm text-yellow-600">
          系統檢測到此票券於 {ticketDetails.transferredAt ? new Date(ticketDetails.transferredAt).toLocaleString() : '未知時間'} 被轉讓。
          {!syncingBlockchain && !syncSuccess ? '點擊下方按鈕同步到區塊鏈。' : ''}
        </p>
        
        {syncSuccess ? (
          <div className="mt-3 bg-green-50 border border-green-100 p-3 rounded text-green-700 text-sm">
            <p className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              同步成功！正在重新載入交易歷史...
            </p>
          </div>
        ) : (
          <button
            onClick={syncBlockchainRecords}
            disabled={syncingBlockchain}
            className={`mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm flex items-center ${
              syncingBlockchain ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {syncingBlockchain ? (
              <>
                <LoadingSpinner size="small" /> 正在同步到區塊鏈...
              </>
            ) : (
              <>同步到區塊鏈</>
            )}
          </button>
        )}
        
        <p className="text-xs text-yellow-500 mt-2">
          在轉讓功能的最新版本中，所有交易將即時記錄到區塊鏈。
        </p>
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
