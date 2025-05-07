import { useState, useEffect } from 'react';
import LoadingSpinner from '../ui/LoadingSpinner';

interface Transaction {
  transactionDate: string;
  action: string;
  fromUser?: string;
  toUser?: string;
  blockchainRef?: string;
}

interface BlockchainVisualizerProps {
  ticketId: string;
}

export default function BlockchainVisualizer({ ticketId }: BlockchainVisualizerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [, setIsRecorded] = useState(false);

  useEffect(() => {
    const fetchBlockchainHistory = async () => {
      try {
        setLoading(true);
        const accessToken = localStorage.getItem('accessToken');
        
        // First check if ticket is on blockchain
        const recordedResponse = await fetch(`/api/tickets/${ticketId}/blockchain/status`, {
          headers: {
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
          }
        });
        
        if (recordedResponse.ok) {
          const data = await recordedResponse.json();
          setIsRecorded(data.isRecorded);
        }
        
        // Get blockchain history
        const response = await fetch(`/api/tickets/${ticketId}/blockchain/history`, {
          headers: {
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
          }
        });
        
        if (!response.ok) {
          throw new Error('無法獲取區塊鏈歷史');
        }
        
        const data = await response.json();
        setTransactions(Array.isArray(data) ? data : data.history || []);
      } catch (err) {
        console.error('Error fetching blockchain history:', err);
        setError(err instanceof Error ? err.message : '獲取區塊鏈資料時出錯');
      } finally {
        setLoading(false);
      }
    };
    
    if (ticketId) {
      fetchBlockchainHistory();
    }
  }, [ticketId]);

  if (loading) {
    return (
      <div className="flex justify-center py-4">
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

  // No blockchain records
  if (transactions.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 p-4 rounded-md text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-gray-600 text-sm">此票券暫無區塊鏈交易記錄</p>
        <p className="text-xs text-gray-500 mt-2">
          所有後續的票券操作將自動記錄到區塊鏈上
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h5 className="text-sm font-medium text-gray-700 mb-2">區塊鏈交易記錄</h5>
      <div className="overflow-x-auto">
        <div className="flex items-center space-x-4 pb-4 overflow-x-auto">
          {transactions.map((tx, index) => {
            return (
              <div 
                key={index} 
                className="min-w-[180px] bg-white border rounded-md p-3 shadow-sm"
              >
                <div className="flex items-center mb-2">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    tx.action === 'create' ? 'bg-green-500' :
                    tx.action === 'transfer' ? 'bg-blue-500' :
                    tx.action === 'use' ? 'bg-purple-500' :
                    tx.action === 'verify' ? 'bg-yellow-500' : 'bg-gray-500'
                  }`}></div>
                  <span className="text-xs font-medium">{
                    tx.action === 'create' ? '創建票券' :
                    tx.action === 'transfer' ? '轉讓票券' :
                    tx.action === 'use' ? '使用票券' :
                    tx.action === 'verify' ? '驗證票券' :
                    tx.action
                  }</span>
                </div>
                
                <div className="text-xs text-gray-500 mb-1">
                  {new Date(tx.transactionDate).toLocaleString('zh-HK')}
                </div>
                
                {tx.action === 'transfer' && (tx.fromUser || tx.toUser) && (
                  <div className="text-xs">
                    {tx.fromUser && <div>從: {tx.fromUser}</div>}
                    {tx.toUser && <div>至: {tx.toUser}</div>}
                  </div>
                )}
                
                {tx.blockchainRef && (
                  <div className="text-xs text-gray-400 mt-2 truncate" title={tx.blockchainRef}>
                    {tx.blockchainRef.substring(0, 8)}...{tx.blockchainRef.substring(tx.blockchainRef.length - 8)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
