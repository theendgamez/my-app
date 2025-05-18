"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import AdminPage from '@/components/admin/AdminPage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/context/AuthContext';
import { Ticket } from '@/types';

// Define a type for parsed QR code data
interface ParsedQRData {
  ticketId: string;
  timestamp?: number;
  signature?: string;
  nonce?: string;
  [key: string]: unknown;
}

export default function AdminTicketVerifyPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Using these variables in the UI behavior based on query params
  const token = searchParams.get('token');
  const source = searchParams.get('source');
  const shouldRedirect = searchParams.get('redirect') === 'true';
  const quickMode = searchParams.get('quick') === 'true';
  
  // We need the loading state from auth, can ignore isAdmin since AdminPage handles that
  const { loading: authLoading } = useAuth();
  const [ticket, setTicket] = useState<Ticket| null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Improved function for formatting dates consistently with timezone correction
  const formatDateTime = (timestamp: string | number | Date | null | undefined): string => {
    if (!timestamp) return '未知';
    
    try {
      // Convert string numbers to actual numbers
      let parsedTimestamp = timestamp;
      if (typeof timestamp === 'string' && !isNaN(Number(timestamp))) {
        parsedTimestamp = Number(timestamp);
      }
      
      const date = new Date(parsedTimestamp);
        
      // Check if date is valid before formatting
      if (isNaN(date.getTime())) return '未知';
      
      // Check for future dates (more than 1 hour ahead) - likely system clock issue
      const now = new Date();
      if (date.getTime() > now.getTime() + (60 * 60 * 1000)) {
        console.warn('Future date detected:', date, 'Current time:', now);
        // Use current time instead if the date is suspiciously in the future
        return now.toLocaleString('zh-TW', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit',
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        });
      }
      
      // Format with locale-specific date and time
      return date.toLocaleString('zh-TW', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      console.error('Date formatting error:', e);
      return '未知';
    }
  };

  // Wrap markAsUsed with useCallback to maintain stable function reference
  const markAsUsed = useCallback(async () => {
    if (!id || verifying) return;
    
    try {
      setVerifying(true);
      setError(null);
      
      const accessToken = localStorage.getItem('accessToken') || '';
      const userId = localStorage.getItem('userId') || '';
      const ticketId = typeof id === 'string' ? id : id[0];
      
      // Generate a unique request ID to track this verification attempt
      const requestId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      console.log(`Starting verification request ${requestId} for ticket ${ticketId}`);
      
      // First check the current ticket state with forced cache bypass
      const bypassCache = `nocache=${Date.now()}`;
      const checkResponse = await fetch(`/api/tickets/${ticketId}?verifying=true&${bypassCache}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-user-id': userId,
          'x-ticket-checker': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        console.log("Initial ticket status check:", checkData.status);
        
        if (checkData.status === 'used') {
          // Do additional verification to confirm the ticket is really used
          const verifyResponse = await fetch(`/api/tickets/${ticketId}/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
              'x-user-id': userId,
              'x-ticket-checker': 'true'
            },
            body: JSON.stringify({ 
              qrData: { ticketId },
              checkOnly: true, // Just check, don't mark as used
              timestamp: Date.now()
            })
          });
          
          const verifyResult = await verifyResponse.json();
          console.log("Double-check verification result:", verifyResult);
          
          // Only show "already used" if both checks confirm it
          if (verifyResult.status === 'used') {
            // Get the most accurate timestamp available
            const usageTime = 
              verifyResult.details?.usedAt || 
              checkData.verificationInfo?.lastVerified || 
              checkData.verificationInfo?.usageTimestamp;
              
            setSuccess(`此票券已驗證通過並於 ${formatDateTime(usageTime)} 使用`);
            setTicket(checkData);
            setVerifying(false);
            return;
          }
          
          // If the double-check doesn't confirm it's used, we'll proceed
          console.log("Status mismatch between DB and verification - proceeding with verification");
        }
      }
      
      // Main verification - pass the unique request ID to help trace this specific request
      const verifyResponse = await fetch(`/api/tickets/${ticketId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-user-id': userId,
          'x-ticket-checker': 'true',
          'x-request-id': requestId
        },
        body: JSON.stringify({ 
          qrData: { ticketId },
          useTicket: true,
          location: 'Admin Panel',
          timestamp: Date.now(),
          requestId
        })
      });
      
      const verifyResult = await verifyResponse.json();
      
      if (!verifyResult.verified && verifyResult.status === 'used') {
        // If ticket was already used, show as success instead of error
        setSuccess(`票券已成功標記為已使用！入場完成！`);
        
        // Fetch updated ticket info
        const updatedTicketResponse = await fetch(`/api/tickets/${ticketId}`, {
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
        return;
      }
      
      if (!verifyResult.verified) {
        throw new Error(verifyResult.message || '票券驗證失敗');
      }
      
      // If verification successful, update the ticket status directly
      const response = await fetch(`/api/admin/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-user-id': userId
        },
        body: JSON.stringify({ 
          status: 'used',
          usageTimestamp: verifyResult.usageTimestamp || Date.now()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `操作失敗: ${response.status}`);
      }
      
      // 更新成功
      setSuccess('票券已成功標記為已使用！入場完成！');
      
      // 重新獲取票券信息
      const updatedTicketResponse = await fetch(`/api/tickets/${ticketId}`, {
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
  }, [id, verifying]);

  // 獲取票券資料
  useEffect(() => {
    const fetchTicket = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const accessToken = localStorage.getItem('accessToken') || '';
        const userId = localStorage.getItem('userId') || '';
        
        // Improved handling for QR format - check if the ID is in QR code format
        let ticketId = id as string;
        const qrData = searchParams.get('data'); // Get data from URL if provided from iOS camera
        let parsedQRData: ParsedQRData | null = null;

        // Try to parse if it appears to be a JSON string or we have a data parameter
        if (qrData) {
          try {
            const decoded = Buffer.from(qrData, 'base64').toString();
            const parsed = JSON.parse(decoded) as ParsedQRData;
            console.log("Parsed QR data from URL:", parsed);

            if (parsed.ticketId) {
              ticketId = parsed.ticketId;
              parsedQRData = parsed; // Save the entire QR data for verification
            }
          } catch (error) {
            console.log('Could not parse QR data from URL:', error);
          }
        } else if (typeof ticketId === 'string' && (ticketId.includes('{') || ticketId.includes('['))) {
          try {
            const parsed = JSON.parse(ticketId) as ParsedQRData;
            console.log("Parsed QR data:", parsed);

            // If it's from our QR scanner with proper format, use the ticketId
            if (parsed.ticketId) {
              ticketId = parsed.ticketId;
              parsedQRData = parsed; // Save the entire QR data for verification
            }
          } catch (error) {
            // If parsing fails, use the original ID
            console.log('Could not parse QR code data, using as-is:', error);
          }
        }
        
        // Fetch the ticket data first
        const response = await fetch(`/api/tickets/${ticketId}?verifying=true`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'x-user-id': userId,
            'x-ticket-checker': 'true'
          }
        });
        
        if (!response.ok) {
          throw new Error(`無法獲取票券資料: ${response.status}`);
        }
        
        const data = await response.json();
        setTicket(data);
        
        // Improved ticket status check with more detailed information
        if (data.status === 'used') {
          // Get the usage time from all possible sources
          const usedTime = data.verificationInfo?.lastVerified 
            ? formatDateTime(data.verificationInfo.lastVerified)
            : data.verificationInfo?.usageTimestamp
              ? formatDateTime(data.verificationInfo.usageTimestamp)
              : '未知時間';
          
          setError(`此票券已於 ${usedTime} 被使用。請核對使用記錄確認是否有異常。`);
          return;
        }
        
        // If we have QR data from a dynamic QR code, also verify it
        if (parsedQRData && parsedQRData.ticketId && parsedQRData.signature) {
          console.log("Verifying dynamic QR data for ticket:", ticketId);

          const verifyResponse = await fetch(`/api/tickets/${ticketId}/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
              'x-user-id': userId,
              'x-ticket-checker': 'true'
            },
            body: JSON.stringify({ qrData: parsedQRData })
          });

          const verifyResult = await verifyResponse.json();
          console.log("QR verification result:", verifyResult);

          if (!verifyResult.verified) {
            // Show a specific error based on the verification result
            if (verifyResult.status === 'used') {
              const usedTime = verifyResult.details?.usedAt 
                ? new Date(verifyResult.details.usedAt).toLocaleString() 
                : verifyResult.details?.usageTimestamp 
                  ? new Date(verifyResult.details.usageTimestamp).toLocaleString()
                  : '未知時間';
              
              setError(`票券QR碼驗證失敗: 此票券已於 ${usedTime} 被使用`);
            } else {
              setError(`票券QR碼驗證失敗: ${verifyResult.message}`);
            }
          }
        }
        
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
  }, [id, authLoading, token, source, shouldRedirect, markAsUsed, searchParams]);
  
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
    if (quickMode) {
      router.push('/admin/tickets/scan?quick=true');
    } else {
      router.push('/admin/tickets');
    }
  };
  
  // Continue scanning in quick mode
  const continueScan = () => {
    router.push('/admin/tickets/scan?quick=true');
  };

  return (
    <AdminPage title="票券驗證" isLoading={authLoading} backLink={quickMode ? "/admin/tickets/scan?quick=true" : "/admin/tickets"}>
      <div className={`bg-white rounded-lg shadow p-3 sm:p-6 ${quickMode ? 'max-w-md mx-auto' : ''}`}>
        {loading ? (
          <div className="flex justify-center py-8 sm:py-12">
            <LoadingSpinner size="large" />
          </div>
        ) : error ? (
          <div className="text-center">
            {ticket && ticket.status === 'used' ? (
              <div className="mb-4">
                <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-blue-100 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-blue-700 mb-2">入場完成</h3>
                <p className="text-blue-800 text-lg mb-4">
                  此票券已成功驗證並使用
                </p>
                
                {ticket && (
                  <div className="bg-white border border-blue-200 rounded-lg p-4 mb-4 text-left">
                    <p className="mb-1"><span className="font-medium">持票人:</span> {ticket.userRealName || '未提供姓名'}</p>
                    <p className="mb-1"><span className="font-medium">活動:</span> {ticket.eventName}</p>
                    <p className="mb-1"><span className="font-medium">使用時間:</span> {
                      formatDateTime(
                        ticket.verificationInfo?.lastVerified || 
                        ticket.verificationInfo?.usageTimestamp
                      )
                    }</p>
                  </div>
                )}
              </div>
            ) : (
              <Alert type="error" message={error} />
            )}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 justify-center">
              <button onClick={goBack} className="px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded text-base">
                返回
              </button>
              {quickMode && (
                <button onClick={continueScan} className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded text-base">
                  繼續掃描
                </button>
              )}
            </div>
          </div>
        ) : ticket ? (
          <div>
            {success && (
              <div className="mb-4 sm:mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-green-800 mb-1">{success}</h3>
                  {ticket.status === 'used' && (
                    <p className="text-sm text-green-600">使用時間: {
                      formatDateTime(
                        ticket.verificationInfo?.lastVerified || 
                        ticket.verificationInfo?.usageTimestamp
                      )
                    }</p>
                  )}
                </div>
              </div>
            )}
            
            <div className={`mb-4 sm:mb-6 flex justify-between items-start ${quickMode ? 'flex-col gap-2 sm:flex-row' : ''}`}>
              <h2 className="text-lg sm:text-xl font-bold">票券詳情</h2>
              
              {!quickMode && (
                <div className="flex space-x-2">
                  <button 
                    onClick={goBack}
                    className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                  >
                    返回列表
                  </button>
                  
                  <button 
                    onClick={() => router.push(`/admin/tickets/${id}`)}
                    className="px-3 py-2 bg-blue-100 hover:bg-blue-200 rounded text-sm text-blue-800"
                  >
                    詳細資料
                  </button>
                </div>
              )}
            </div>
            
            {/* Ticket status badge - make it more prominent */}
            <div className="mb-4 sm:mb-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium 
                  ${ticket.status === 'available' || ticket.status === 'sold' ? 'bg-green-100 text-green-800' : 
                  ticket.status === 'used' ? 'bg-blue-100 text-blue-800' : 
                  'bg-red-100 text-red-800'}`}>
                  {ticket.status === 'available' ? '可用' :
                  ticket.status === 'sold' ? '已售出' :
                  ticket.status === 'used' ? '已使用' : '已取消'}
                </span>
                {ticket.status === 'used' && (
                  <span className="text-xs text-gray-500">
                    {ticket.verificationInfo?.lastVerified && 
                      `入場時間: ${new Date(ticket.verificationInfo.lastVerified).toLocaleString()}`}
                  </span>
                )}
              </div>
            </div>
            
            <div className={`space-y-4 ${quickMode ? '' : 'grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6'}`}>
              <div className="space-y-3">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-blue-800 font-medium">持票人資訊</p>
                  <p className="text-lg font-bold mt-1 break-words">{ticket.userRealName || '未提供姓名'}</p>
                  <p className="text-sm text-gray-600">用戶ID: {ticket.userId?.substring(0, 8)}...</p>
                </div>
                
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-purple-800 font-medium">活動資訊</p>
                  <p className="font-bold break-words">{ticket.eventName}</p>
                  <p className="text-sm">{ticket.formattedEventDate}</p>
                  <p className="text-sm break-words">{ticket.eventLocation}</p>
                </div>
                
                <div className="bg-amber-50 p-3 rounded-lg">
                  <p className="text-amber-800 font-medium">票券資訊</p>
                  <p className="font-bold">區域: {ticket.zone}</p>
                  {ticket.seatNumber && (
                    <p>座位號碼: {ticket.seatNumber}</p>
                  )}
                </div>
              </div>
              
              {!quickMode && (
                <div className="space-y-4">
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
              )}
            </div>
            
            {/* Mobile-optimized action buttons */}
            <div className={`mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200 ${quickMode ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 sm:flex sm:flex-wrap gap-3 sm:gap-4'}`}>
              {(ticket.status === 'available' || ticket.status === 'sold') && (
                <button
                  onClick={markAsUsed}
                  disabled={verifying}
                  className={`px-4 py-3 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-medium rounded-lg text-center ${quickMode ? 'w-full' : 'sm:flex-1'} ${verifying ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {verifying ? '處理中...' : '確認入場'}
                </button>
              )}
              
              {!quickMode && (ticket.status === 'available' || ticket.status === 'sold') && (
                <button
                  onClick={cancelTicket}
                  disabled={verifying}
                  className={`px-4 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg text-center ${verifying ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {verifying ? '處理中...' : '取消票券'}
                </button>
              )}
              
              {quickMode && (
                <button
                  onClick={continueScan}
                  disabled={verifying}
                  className={`px-4 py-3 bg-blue-500 hover:bg-blue-600 active:bg-blue-800 text-white font-medium rounded-lg text-center w-full ${verifying ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  繼續掃描
                </button>
              )}
              
              {!quickMode && (
                <button
                  onClick={goBack}
                  disabled={verifying}
                  className={`px-4 py-3 bg-gray-500 hover:bg-gray-600 active:bg-gray-800 text-white rounded-lg text-center ${verifying ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  返回票券列表
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 sm:py-12">
            <p className="text-gray-500">找不到票券資料</p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xs mx-auto">
              <button onClick={goBack} className="px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg">
                返回列表
              </button>
              {quickMode && (
                <button onClick={continueScan} className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg">
                  繼續掃描
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminPage>
  );
}
