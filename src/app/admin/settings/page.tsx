"use client";

import AdminPage from '@/components/admin/AdminPage';

export default function AdminSettingsPage() {
  return (
    <AdminPage title="系統設定" isLoading={false}>
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">系統設定功能開發中</h2>
        <p className="text-gray-600">此功能即將推出，敬請期待！</p>
      </div>
    </AdminPage>
  );
}
