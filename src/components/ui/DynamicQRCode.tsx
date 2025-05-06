'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import LoadingSpinner from './LoadingSpinner';

interface DynamicQRCodeProps {
  ticketId: string;
  initialQrData: string;
  refreshInterval?: number; // 自動刷新間隔（秒）
  size?: number;
}

export default function DynamicQRCode({
  ticketId,
  initialQrData,
  refreshInterval = 300, // 默認5分鐘刷新
  size = 200
}: DynamicQRCodeProps) {
  const [qrData, setQrData] = useState(initialQrData);
  const [timeLeft, setTimeLeft] = useState(refreshInterval);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextRefreshTime, setNextRefreshTime] = useState<Date | null>(null);

  // 使用 useCallback 記憶化刷新QR碼的函數
  const refreshQRCode = useCallback(async () => {
    if (isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      setError(null);
      
      // Get the current userId from localStorage
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const accessToken = localStorage.getItem('accessToken') || '';
      
      const response = await fetch('/api/tickets/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-user-id': userId
        },
        body: JSON.stringify({ ticketId })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to refresh QR code');
      }
      
      const data = await response.json();
      
      // 更新QR碼數據
      if (data.ticket && data.ticket.qrCode) {
        setQrData(data.ticket.qrCode);
      
        // 設置下一次刷新時間
        if (data.ticket.nextRefresh) {
          setNextRefreshTime(new Date(data.ticket.nextRefresh));
        } else {
          const now = new Date();
          setNextRefreshTime(new Date(now.getTime() + refreshInterval * 1000));
        }
        
        setTimeLeft(refreshInterval);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('QR code refresh error:', error);
      setError(error instanceof Error ? error.message : '刷新QR碼失敗');
    } finally {
      setIsRefreshing(false);
    }
  }, [ticketId, isRefreshing, refreshInterval]);

  // 自動倒計時
  useEffect(() => {
    if (!nextRefreshTime) {
      const now = new Date();
      setNextRefreshTime(new Date(now.getTime() + refreshInterval * 1000));
    }
    
    const timer = setInterval(() => {
      if (nextRefreshTime) {
        const now = new Date();
        const secondsLeft = Math.max(0, Math.floor((nextRefreshTime.getTime() - now.getTime()) / 1000));
        setTimeLeft(secondsLeft);
        
        // 時間到自動刷新
        if (secondsLeft === 0 && !isRefreshing) {
          refreshQRCode();
        }
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [nextRefreshTime, isRefreshing, refreshInterval, refreshQRCode]);

  // 格式化剩餘時間
  const formatTimeLeft = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {isRefreshing && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 rounded">
            <LoadingSpinner size="medium" />
          </div>
        )}
        <QRCodeSVG 
          value={qrData} 
          size={size} 
          level="H" 
          includeMargin={true}
        />
      </div>
      
      <div className="mt-3 text-center">
        <p className="text-sm text-gray-600">QR碼將在 <span className="font-medium">{formatTimeLeft()}</span> 後自動刷新</p>
        
        <button
          onClick={refreshQRCode}
          disabled={isRefreshing || timeLeft > refreshInterval - 15} // 只允許在到期前15秒內手動刷新
          className={`mt-2 px-4 py-1 text-sm rounded ${
            isRefreshing || timeLeft > refreshInterval - 15 
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isRefreshing ? '刷新中...' : '手動刷新'}
        </button>
        
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
