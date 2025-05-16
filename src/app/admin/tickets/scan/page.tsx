"use client";

import { useState } from 'react';
import AdminPage from '@/components/admin/AdminPage';
import QRScanner from '@/components/admin/QRScanner';
import { Alert } from '@/components/ui/Alert';

export default function AdminTicketScanPage() {
  const [error, setError] = useState<string | null>(null);
  
  const handleScanError = (errorMessage: string) => {
    setError(`掃描錯誤: ${errorMessage}`);
  };

  return (
    <AdminPage title="票券掃描檢票" isLoading={false}>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold">掃描票券QR碼</h2>
          <p className="text-gray-600 mt-2">使用相機掃描票券QR碼以進行檢票驗證</p>
        </div>

        {error && (
          <Alert type="error" message={error} className="mb-6" />
        )}

        <div className="max-w-lg mx-auto">
          <QRScanner
            onError={handleScanError}
            redirectToVerify={true}
          />
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            掃描成功後將自動跳轉到票券驗證頁面
          </p>
        </div>
      </div>
    </AdminPage>
  );
}
