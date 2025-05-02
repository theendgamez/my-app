"use client";

import AdminPage from '@/components/admin/AdminPage';

export default function AdminUsersPage() {
  return (
    <AdminPage title="用戶管理" isLoading={false}>
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">用戶管理功能開發中</h2>
        <p className="text-gray-600">此功能即將推出，敬請期待！</p>
      </div>
    </AdminPage>
  );
}
