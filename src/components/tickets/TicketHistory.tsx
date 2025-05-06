import React, { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface HistoryEntry {
  action: string;
  timestamp: number;
  date: string;
  fromUser?: { userId: string; name: string } | null;
  toUser?: { userId: string; name: string } | null;
  signature: string;
}

interface TicketHistoryProps {
  ticketId: string;
}

export default function TicketHistory({ ticketId }: TicketHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/tickets/${ticketId}/history`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
            'x-user-id': localStorage.getItem('userId') || ''
          }
        });

        if (!response.ok) {
          throw new Error('無法獲取票券交易歷史');
        }

        const data = await response.json();
        setHistory(data.history || []);
      } catch (err) {
        console.error('Error fetching ticket history:', err);
        setError(err instanceof Error ? err.message : '無法獲取交易歷史');
      } finally {
        setLoading(false);
      }
    };

    if (ticketId) {
      fetchHistory();
    }
  }, [ticketId]);

  // Helper to translate action types
  const translateAction = (action: string): string => {
    switch (action) {
      case 'create': return '票券創建';
      case 'transfer': return '票券轉贈';
      case 'use': return '票券使用';
      case 'verify': return '票券驗證';
      case 'cancel': return '票券取消';
      default: return action;
    }
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('zh-HK');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <LoadingSpinner size="small" />
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500 text-sm">{error}</p>;
  }

  if (history.length === 0) {
    return (
      <p className="text-gray-500 text-sm py-2">無可用的交易歷史記錄</p>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-4">票券交易歷史</h3>
      <div className="space-y-4">
        {history.map((entry, index) => (
          <div 
            key={index} 
            className="border-l-4 border-blue-400 pl-4 py-2"
          >
            <div className="flex justify-between">
              <span className="font-medium">{translateAction(entry.action)}</span>
              <span className="text-sm text-gray-500">{formatDate(entry.date)}</span>
            </div>
            
            {entry.fromUser && entry.toUser && (
              <p className="text-sm text-gray-600 mt-1">
                由 <span className="font-medium">{entry.fromUser.name}</span> 
                {entry.action === 'transfer' ? ' 轉贈給 ' : ' 至 '}
                <span className="font-medium">{entry.toUser.name}</span>
              </p>
            )}
            
            <p className="text-xs text-gray-500 mt-1 truncate" title={entry.signature}>
              驗證碼: {entry.signature.substring(0, 10)}...
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
