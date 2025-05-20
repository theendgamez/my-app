"use client";

import AdminPage from '@/components/admin/AdminPage';
import BlockchainExplorer from '@/components/admin/BlockchainExplorer';

export default function AdminBlockchainPage() {
  return (
    <AdminPage title="區塊鏈瀏覽器">
      <BlockchainExplorer />
    </AdminPage>
  );
}
