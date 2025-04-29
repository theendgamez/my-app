"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/utils/fetchWithAuth';

// Define types for our stats
interface DashboardStats {
  totalEvents: number;
  totalUsers: number;
  totalTickets: number;
  activeEvents: number;
  pendingPayments: number;
  recentSales: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        const response = await fetchWithAuth('/api/admin/dashboard');
        
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch dashboard data');
        }
        
        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-red-600 mb-4">Error Loading Dashboard</h2>
        <p className="text-gray-700 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          重試
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-6">管理員儀表板</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 統計卡片 */}
        <StatCard title="總活動數" value={stats?.totalEvents || 0} icon="📅" color="bg-blue-500" />
        <StatCard title="總用戶數" value={stats?.totalUsers || 0} icon="👥" color="bg-green-500" />
        <StatCard title="總售出票券" value={stats?.totalTickets || 0} icon="🎟️" color="bg-purple-500" />
        <StatCard title="進行中活動" value={stats?.activeEvents || 0} icon="🔄" color="bg-yellow-500" />
        <StatCard title="待付款訂單" value={stats?.pendingPayments || 0} icon="⏳" color="bg-red-500" />
        <StatCard title="近7天銷售" value={stats?.recentSales || 0} icon="💰" color="bg-indigo-500" prefix="HKD" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">快捷操作</h2>
          <div className="flex flex-wrap gap-4">
            <QuickActionButton 
              label="建立活動" 
              onClick={() => router.push('/admin/create-event')} 
              icon="✨"
            />
            <QuickActionButton 
              label="管理用戶" 
              onClick={() => router.push('/admin/users')} 
              icon="👤"
            />
            <QuickActionButton 
              label="檢視訂單" 
              onClick={() => router.push('/admin/bookings')} 
              icon="📋"
            />
            <QuickActionButton 
              label="抽獎設定" 
              onClick={() => router.push('/admin/lottery')} 
              icon="🎲"
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">系統狀態</h2>
          <div className="space-y-3">
            <StatusItem label="系統運行狀態" status="正常" statusColor="text-green-500" />
            <StatusItem label="資料庫連接" status="連接中" statusColor="text-green-500" />
            <StatusItem label="API 服務" status="運行中" statusColor="text-green-500" />
            <StatusItem label="上次更新" status={new Date().toLocaleString()} statusColor="text-gray-600" />
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  prefix?: string;
}

function StatCard({ title, value, icon, color, prefix = '' }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 flex items-center">
      <div className={`${color} w-12 h-12 rounded-full flex items-center justify-center text-white text-xl mr-4`}>
        {icon}
      </div>
      <div>
        <h3 className="text-gray-500 text-sm">{title}</h3>
        <p className="text-2xl font-bold">{prefix} {typeof value === 'number' ? value.toLocaleString() : value}</p>
      </div>
    </div>
  );
}

interface QuickActionButtonProps {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}

function QuickActionButton({ label, onClick, icon }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

interface StatusItemProps {
  label: string;
  status: string;
  statusColor: string;
}

function StatusItem({ label, status, statusColor }: StatusItemProps) {
  return (
    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
      <span className="text-gray-600">{label}</span>
      <span className={`font-medium ${statusColor}`}>{status}</span>
    </div>
  );
}
