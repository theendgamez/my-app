import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { refreshTicketQrCode } from '@/lib/blockchain';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { DynamicTicketData } from '@/types';

interface DynamicQRCodeProps {
  ticketId: string;
  initialQrData?: string;
  refreshInterval?: number; // 刷新間隔（秒）
  size?: number;
  showVerifyInfo?: boolean;
}

export default function DynamicQRCode({
  ticketId,
  initialQrData,
  refreshInterval = 300, // 預設5分鐘刷新一次
  size = 200,
  showVerifyInfo = false
}: DynamicQRCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dynamicData, setDynamicData] = useState<DynamicTicketData | null>(null);
  const [countdown, setCountdown] = useState<number>(refreshInterval);
  const [verifying, setVerifying] = useState<boolean>(false);

  // 刷新QR碼的函數
  const refreshQRCode = async () => {
    try {
      setVerifying(true);

      // 獲取票券資料（添加認證信息）
      const accessToken = localStorage.getItem('accessToken') || '';
      const userId = localStorage.getItem('userId') || '';
      
      const response = await fetch(`/api/tickets/${ticketId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-user-id': userId
        }
      });
      
      if (!response.ok) {
        // 更詳細的錯誤處理
        if (response.status === 403) {
          console.warn('權限不足，無法訪問票券資料。將使用初始QR碼。');
          if (initialQrData) {
            generateInitialQR();
            return;
          }
          throw new Error('無權訪問此票券資料');
        }
        throw new Error(`無法取得票券資料: ${response.status}`);
      }
      
      const ticket = await response.json();

      // 生成新的動態數據
      const newDynamicData = await refreshTicketQrCode(ticket);
      setDynamicData(newDynamicData);

      // 創建包含動態數據的QR碼內容
      const qrContent = JSON.stringify({
        ticketId,
        timestamp: newDynamicData.timestamp,
        signature: newDynamicData.signature,
        nonce: newDynamicData.nonce
      });

      // 生成QR碼
      const dataUrl = await QRCode.toDataURL(qrContent, {
        width: size,
        margin: 2,
        errorCorrectionLevel: 'H',
      });
      
      setQrDataUrl(dataUrl);
      setCountdown(refreshInterval);
    } catch (err) {
      console.error('刷新QR碼時出錯:', err);
      setError('無法刷新票券QR碼，請稍後再試');
      
      // 如果有初始QR碼數據，回退到它
      if (initialQrData) {
        generateInitialQR();
      }
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  // 從初始數據生成QR碼
  const generateInitialQR = async () => {
    try {
      if (initialQrData?.startsWith('data:image/')) {
        // 已經是資料URL
        setQrDataUrl(initialQrData);
      } else {
        // 是字符串，需要生成QR碼
        const dataUrl = await QRCode.toDataURL(initialQrData || ticketId, {
          width: size,
          margin: 2,
          errorCorrectionLevel: 'H',
        });
        setQrDataUrl(dataUrl);
      }
    } catch (err) {
      console.error('生成初始QR碼時出錯:', err);
      setError('無法顯示票券QR碼');
    } finally {
      setLoading(false);
    }
  };

  // 初始加載
  useEffect(() => {
    if (ticketId) {
      refreshQRCode();
    } else if (initialQrData) {
      generateInitialQR();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, initialQrData]);

  // 倒計時刷新
  useEffect(() => {
    if (!ticketId) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          refreshQRCode();
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, refreshInterval]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <LoadingSpinner size="medium" />
        <p className="mt-2 text-sm text-gray-500">正在載入QR碼...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center bg-red-50 p-4 rounded-lg" style={{ width: size, height: size }}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="mt-2 text-xs text-red-600 text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="bg-white p-3 rounded-lg shadow-sm border">
          <Image 
            src={qrDataUrl}
            alt={`Ticket QR Code: ${ticketId}`}
            width={size}
            height={size}
            className="rounded"
          />
          
          {verifying && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 rounded-lg">
              <LoadingSpinner size="small" />
            </div>
          )}
        </div>
        
        {showVerifyInfo && dynamicData && (
          <div className="absolute -top-2 -right-2 bg-green-500 text-white p-1 rounded-full w-6 h-6 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
      
      <div className="mt-2 text-center">
        <p className="text-xs text-gray-500">
          {ticketId.substring(0, 8)}...
        </p>
        
        {showVerifyInfo && (
          <div className="mt-1">
            <p className="text-xs text-gray-600">
              <span className="font-medium">區塊鏈驗證</span> · {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
