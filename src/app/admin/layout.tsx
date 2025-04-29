import AdminSidebar from '@/components/admin/Sidebar';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '管理員控制台 | 票券平台',
  description: '票券平台管理員控制台',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      <AdminSidebar />
      
      <div className="lg:ml-64 p-6">
        <main className="pt-4">
          {children}
        </main>
      </div>
    </div>
  );
}
