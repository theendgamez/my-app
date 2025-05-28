import React, { useState,useCallback } from 'react';
import { useRouter } from 'next/navigation';
import QRScanner from './QRScanner';
import LoadingSpinner from '../ui/LoadingSpinner';
import { adminFetch, updateTicketStatus, handleAdminError } from '@/utils/adminApi';
import { Ticket } from '@/types/index';
// This component allows admins to scan and verify tickets, with options for auto-verification and custom success/error handling.

interface TicketCheckerProps {
  autoVerify?: boolean;
  onSuccess?: (ticketId: string) => void;
  onError?: (error: string) => void;
}

export default function TicketChecker({ 
  autoVerify = true, 
  onSuccess, 
  onError 
}: TicketCheckerProps) {
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    ticketInfo?: {
      ticketId: string;
      eventName: string;
      userName: string;
      zone: string;
      usedAt?: string;
      verifiedBy?: string;
      verificationCount?: number;
      location?: string;
    };
  } | null>(null);
  const router = useRouter();

  const handleScan = useCallback(async (ticketId: string) => {
    
    try {
      
      // Use adminFetch for consistent authentication
      const ticket = await adminFetch(`/api/tickets/${ticketId}?verifying=true`) as Ticket;
      
      // Check if ticket is already used - enhanced error message
      if (ticket.status === 'used') {
        setResult({
          success: false,
          message: '此票券已被使用',
          ticketInfo: {
            ticketId: ticket.ticketId,
            eventName: ticket.eventName,
            userName: ticket.userRealName || '未提供姓名',
            zone: ticket.zone ?? '未知區域',
            usedAt: ticket.verificationInfo?.lastVerified 
              ? new Date(ticket.verificationInfo.lastVerified).toLocaleString('zh-TW') 
              : '未知時間',
            verifiedBy: ticket.verificationInfo?.verifierName || '未知人員',
            verificationCount: ticket.verificationInfo?.verificationCount || 1,
            location: ticket.verificationInfo?.eventLocation || '未知地點'
          }
        });
        return;
      }
      
      // Check if ticket is cancelled
      if (ticket.status === 'cancelled') {
        setResult({
          success: false,
          message: '此票券已被取消',
          ticketInfo: {
            ticketId: ticket.ticketId,
            eventName: ticket.eventName,
            userName: ticket.userRealName || '未提供姓名',
            zone: ticket.zone ?? '未知區域'
          }
        });
        return;
      }
      
      // If autoVerify is enabled, automatically mark the ticket as used
      if (autoVerify) {
        await updateTicketStatus(ticketId, 'used');
        
        setResult({
          success: true,
          message: '票券驗證成功，已標記為已使用！',
          ticketInfo: {
            ticketId: ticket.ticketId,
            eventName: ticket.eventName,
            userName: ticket.userRealName || '未提供姓名',
            zone: ticket.zone ?? '未知區域'
          }
        });
        
        if (onSuccess) {
          onSuccess(ticketId);
        }
      } else {
        // Just return the ticket details
        setResult({
          success: true,
          message: '票券有效，請點擊確認入場',
          ticketInfo: {
            ticketId: ticket.ticketId,
            eventName: ticket.eventName,
            userName: ticket.userRealName || '未提供姓名',
            zone: ticket.zone ?? '未知區域'
          }
        });
      }
    } catch (err) {
      console.error('Error verifying ticket:', err);
      const errorMessage = handleAdminError(err);
      setResult({
        success: false,
        message: errorMessage
      });
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setProcessing(false);
    }
  }, [autoVerify, onSuccess, onError]);
  
  const handleScanError = useCallback((error: string) => {
    if (onError) {
      onError(error);
    }
  }, [onError]);
  
  const handleMarkAsUsed = async () => {
    if (!result?.ticketInfo?.ticketId || processing) return;
    
    try {
      setProcessing(true);
      
      await updateTicketStatus(result.ticketInfo.ticketId, 'used');
      
      setResult({
        ...result,
        success: true,
        message: '票券已標記為已使用！'
      });
      
      if (onSuccess) {
        onSuccess(result.ticketInfo.ticketId);
      }
    } catch (err) {
      console.error('Error marking ticket as used:', err);
      const errorMessage = handleAdminError(err);
      setResult({
        ...result,
        success: false,
        message: errorMessage
      });
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setProcessing(false);
    }
  };
  
  const handleReset = () => {
    setResult(null);
    setScanning(true);
  };

  return (
    <div className="w-full mx-auto max-w-md">
      {scanning && !result && (
        <div className="mb-4">
          <QRScanner 
            onScan={handleScan}
            onError={handleScanError}
            redirectToVerify={false}
          />
        </div>
      )}
      
      {processing && (
        <div className="flex flex-col items-center justify-center p-8">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">正在驗證票券...</p>
        </div>
      )}
      
      {result && (
        <div className={`w-full p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center mb-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
              {result.success ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <h3 className={`ml-3 text-lg font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
              {result.success ? '驗證成功' : '驗證失敗'}
            </h3>
          </div>
          
          <p className={`text-base mb-4 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
            {result.message}
          </p>
          
          {result.ticketInfo && (
            <div className={`p-3 rounded-md mb-4 ${result.success ? 'bg-white' : 'bg-red-100/50'}`}>
              <h4 className="font-medium mb-2">票券資訊</h4>
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                <span className="text-gray-600">活動名稱:</span>
                <span className="font-medium">{result.ticketInfo.eventName}</span>
                
                <span className="text-gray-600">持票人:</span>
                <span className="font-medium">{result.ticketInfo.userName}</span>
                
                <span className="text-gray-600">區域:</span>
                <span className="font-medium">{result.ticketInfo.zone}</span>
                
                <span className="text-gray-600">票券ID:</span>
                <span className="text-xs font-mono">{result.ticketInfo.ticketId}</span>
                
                {!result.success && result.ticketInfo.usedAt && (
                  <>
                    <span className="text-gray-600">使用時間:</span>
                    <span className="font-medium">{result.ticketInfo.usedAt}</span>
                  </>
                )}
              </div>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            {!result.success && result?.ticketInfo && (
              <button
                onClick={() => result.ticketInfo && router.push(`/admin/tickets/verify/${result.ticketInfo.ticketId}`)}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded font-medium"
              >
                查看詳情
              </button>
            )}
            
            {result.success && !autoVerify && !result.message.includes('已標記') && result?.ticketInfo && (
              <button
                onClick={handleMarkAsUsed}
                className="w-full py-2 px-4 bg-green-600 text-white rounded font-medium"
                disabled={processing}
              >
                {processing ? '處理中...' : '確認入場'}
              </button>
            )}
            
            <button
              onClick={handleReset}
              className={`w-full py-2 px-4 rounded font-medium ${result.success 
                ? 'bg-green-100 text-green-800 border border-green-300' 
                : 'bg-gray-100 text-gray-800 border border-gray-300'}`}
              disabled={processing}
            >
              {processing ? '請稍候...' : '繼續掃描'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
