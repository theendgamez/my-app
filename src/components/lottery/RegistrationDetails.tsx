import React from 'react';
import { Registration } from '@/types';

interface RegistrationDetailsProps {
  registration: Registration;
}

export default function RegistrationDetails({ registration }: RegistrationDetailsProps) {
  const getStatusBadge = (status: string, paymentStatus?: string) => {
    if (paymentStatus === 'pending') {
      return <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">未付款</span>;
    }
    
    switch (status) {
      case 'registered':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">等待抽籤</span>;
      case 'won':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">已中籤</span>;
      case 'lost':
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">未中籤</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">{status}</span>;
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
        {getStatusBadge(registration.status, registration.paymentStatus)}
      </div>

      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="font-medium text-gray-700">活動名稱</span>
          <span className="text-gray-900">{registration.eventName || '載入中...'}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="font-medium text-gray-700">登記編號</span>
          <span className="text-gray-900 text-sm">{registration.registrationToken}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="font-medium text-gray-700">選擇區域</span>
          <span className="text-gray-900">{registration.zoneName}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="font-medium text-gray-700">數量</span>
          <span className="text-gray-900">{registration.quantity} 張</span>
        </div>
        
        <div className="flex justify-between">
          <span className="font-medium text-gray-700">登記時間</span>
          <span className="text-gray-900">{formatDate(registration.createdAt)}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="font-medium text-gray-700">付款狀態</span>
          <span className={`${registration.paymentStatus === 'paid' ? 'text-green-600' : 'text-red-600'}`}>
            {registration.paymentStatus === 'paid' ? '已付款' : '未付款'}
          </span>
        </div>
        
        {registration.drawDate && (
          <div className="flex justify-between">
            <span className="font-medium text-gray-700">抽籤日期</span>
            <span className="text-gray-900">{formatDate(registration.drawDate)}</span>
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-800 mb-2">抽籤流程說明</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 登記參與抽籤並支付平台費用</li>
          <li>• 系統在指定日期進行抽籤</li>
          <li>• 中籤者須在限定時間內完成購票</li>
          <li>• 未中籤者可參與其他活動抽籤</li>
        </ul>
      </div>
    </div>
  );
}
