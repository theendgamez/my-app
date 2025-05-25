import React from 'react';
import { Registration } from '@/types';

interface RegistrationDetailsProps {
  registration: Registration;
}

export default function RegistrationDetails({ registration }: RegistrationDetailsProps) {
  const getStatusBadge = (status: string, paymentStatus?: string, platformFeePaid?: boolean) => {
    // If platform fee not paid, show that status first
    if (paymentStatus === 'pending' || platformFeePaid === false) {
      return <span className="inline-block px-2 py-1 text-xs bg-red-100 text-red-800 rounded">平台費未付款</span>;
    }

    // Otherwise show lottery status
    switch (status) {
      case 'registered':
        return <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">等待抽籤</span>;
      case 'drawn':
      case 'won':
        return <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded">已中籤</span>;
      case 'lost':
        return <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">未中籤</span>;
      default:
        return <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">{status || '未知狀態'}</span>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '未指定';
    try {
      return new Date(dateString).toLocaleString('zh-TW');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">抽籤登記詳情</h2>
      
      <div className="mb-4">
        {getStatusBadge(registration.status, registration.paymentStatus, registration.platformFeePaid)}
      </div>

      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="font-medium text-gray-700">活動名稱</span>
          <span className="text-gray-900">{registration.eventName || '載入中...'}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="font-medium text-gray-700">登記編號</span>
          <span className="text-gray-900">{registration.registrationToken}</span>
        </div>

        <div className="flex justify-between">
          <span className="font-medium text-gray-700">選擇區域</span>
          <span className="text-gray-900">{registration.zoneName || '未指定'}</span>
        </div>

        <div className="flex justify-between">
          <span className="font-medium text-gray-700">數量</span>
          <span className="text-gray-900">{registration.quantity || 1}張</span>
        </div>

        <div className="flex justify-between">
          <span className="font-medium text-gray-700">登記時間</span>
          <span className="text-gray-900">{formatDate(registration.createdAt)}</span>
        </div>

        <div className="flex justify-between">
          <span className="font-medium text-gray-700">平台費付款狀態</span>
          <span className={`text-gray-900 ${registration.platformFeePaid ? 'text-green-600' : 'text-red-600'}`}>
            {registration.platformFeePaid ? '已付款' : '未付款'}
          </span>
        </div>
      </div>
    </div>
  );
}
