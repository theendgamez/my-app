'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navbar/Navbar';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';

// Define a proper type for the verification result
interface VerificationResult {
  verified: boolean;
  message: string;
  status?: 'used' | 'cancelled' | 'available' | string;
  ticket?: {
    eventName: string;
    eventDate: string;
    zone: string;
    seatNumber: string;
    userRealName: string;
    // Add other ticket properties as needed
  };
}

export default function VerifyTicketPage() {
  const router = useRouter();
  const { isAuthenticated, isAdmin } = useAuth();
  const [ticketId, setTicketId] = useState('');
  const [qrData, setQrData] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId || !qrData) {
      setError('請輸入票券ID和QR碼數據');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // 嘗試解析QR碼數據
      const parsedQrData = JSON.parse(qrData);

      const response = await fetch(`/api/tickets/${ticketId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
          'x-ticket-checker': 'true'
        },
        body: JSON.stringify({
          qrData: parsedQrData,
          useTicket: false // 只驗證，不使用票券
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '驗證時出錯');
      }

      setResult(data);
    } catch (err) {
      console.error('Verification error:', err);
      setError(err instanceof Error ? err.message : '無法驗證票券');
    } finally {
      setLoading(false);
    }
  };

  const handleUseTicket = async () => {
    if (!result || !result.verified) return;

    setLoading(true);
    try {
      const parsedQrData = JSON.parse(qrData);
      
      const response = await fetch(`/api/tickets/${ticketId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
          'x-ticket-checker': 'true'
        },
        body: JSON.stringify({
          qrData: parsedQrData,
          useTicket: true
        })
      });

      const data = await response.json();
      setResult(data);
    } catch  {
      setError('使用票券時出錯');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || !isAdmin) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto p-4 pt-20">
          <Alert
            type="error"
            message="您沒有權限訪問此頁面"
          />
          <div className="mt-4 text-center">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              返回首頁
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4 pt-20 max-w-lg">
        <h1 className="text-2xl font-bold mb-6">票券驗證</h1>
        
        {error && <Alert type="error" message={error} className="mb-4" onClose={() => setError(null)} />}
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <label htmlFor="ticketId" className="block text-sm font-medium text-gray-700 mb-1">
                票券ID
              </label>
              <input
                id="ticketId"
                type="text"
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
                className="w-full px-4 py-2 border rounded-md"
                placeholder="輸入票券ID"
                required
              />
            </div>
            
            <div>
              <label htmlFor="qrData" className="block text-sm font-medium text-gray-700 mb-1">
                QR碼數據
              </label>
              <textarea
                id="qrData"
                value={qrData}
                onChange={(e) => setQrData(e.target.value)}
                className="w-full px-4 py-2 border rounded-md"
                placeholder='貼上JSON格式的QR碼數據，例如: {"ticketId":"uuid","timestamp":123456789,"signature":"..."}'
                rows={5}
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md disabled:bg-blue-300"
            >
              {loading ? <LoadingSpinner size="small" /> : '驗證票券'}
            </button>
          </form>
          
          {result && (
            <div className="mt-6 p-4 rounded-lg border">
              <h3 className="font-semibold text-lg mb-3">驗證結果</h3>
              
              <div className={`p-3 rounded-lg mb-4 ${
                result.verified ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center">
                  {result.verified ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className={result.verified ? 'text-green-700' : 'text-red-700'}>
                    {result.message}
                  </span>
                </div>
              </div>
              
              {result.verified && result.ticket && (
                <div className="space-y-2">
                  <p><span className="font-medium">活動名稱:</span> {result.ticket.eventName}</p>
                  <p><span className="font-medium">活動時間:</span> {new Date(result.ticket.eventDate).toLocaleString('zh-HK')}</p>
                  <p><span className="font-medium">區域/座位:</span> {result.ticket.zone} / {result.ticket.seatNumber}</p>
                  <p><span className="font-medium">持票人:</span> {result.ticket.userRealName}</p>
                  <p><span className="font-medium">票券狀態:</span> {
                    result.status === 'used' ? '已使用' :
                    result.status === 'cancelled' ? '已取消' :
                    result.status === 'available' ? '有效' :
                    result.status
                  }</p>
                  
                  {result.verified && result.status !== 'used' && (
                    <button
                      onClick={handleUseTicket}
                      disabled={loading}
                      className="mt-4 w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md disabled:bg-green-300"
                    >
                      {loading ? <LoadingSpinner size="small" /> : '使用票券'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
