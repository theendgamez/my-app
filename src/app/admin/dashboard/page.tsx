"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/navbar/Navbar';
import Sidebar from '@/components/ui/Sidebar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Link from 'next/link';

interface DashboardStat {
  label: string;
  value: number;
  icon: JSX.Element;
  linkTo: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { isAdmin, isAuthenticated, loading: authLoading, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalEvents: 0,
    activeEvents: 0,
    totalUsers: 0,
    totalRegistrations: 0,
    pendingPayments: 0,
    completedPayments: 0
  });

  // Check if user is admin, redirect if not
  useEffect(() => {
    if (!authLoading && isAuthenticated && !isAdmin) {
      router.push('/');
    }
    
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/admin/dashboard');
    }
  }, [authLoading, isAuthenticated, isAdmin, router]);

  // Fetch dashboard data
  useEffect(() => {
    if (!authLoading && isAdmin) {
      fetchDashboardStats();
    }
  }, [authLoading, isAdmin]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Get the most current access token
      const accessToken = localStorage.getItem('accessToken') || '';
      
      // Fetch dashboard statistics from API
      const response = await fetch('/api/admin/dashboard', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-user-id': user?.userId || '', // Add user ID as fallback authentication
        },
        // Include credentials to send cookies
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        // Handle different error status codes
        if (response.status === 403) {
          setError('無權訪問管理員儀表板。請確保您具有管理員權限。');
          console.error('Admin access denied. Check user role permissions.');
        } else {
          setError(`無法獲取儀表板數據 (${response.status})`);
        }
        
        // If unauthorized, might need to refresh token or re-login
        if (response.status === 401 || response.status === 403) {
          // Optional: Could add token refresh logic here
          console.log('Authorization failed. Consider refreshing authentication.');
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('獲取儀表板數據時發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!isAdmin) {
    return null; // This will prevent flash of content before redirect
  }

  return (
    <div>
      <Navbar />
      <div className="flex">
        <Sidebar />
        <div className="container mx-auto p-8 ml-64">
          <h1 className="text-2xl font-bold mb-6">管理員儀表板</h1>
          
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
              <button onClick={() => setError(null)} className="ml-2 font-bold">×</button>
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="large" />
            </div>
          ) : (
            <div>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard 
                  label="總活動數" 
                  value={stats.totalEvents} 
                  icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                  linkTo="/admin/events"
                />
                <StatCard 
                  label="活躍活動" 
                  value={stats.activeEvents} 
                  icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  linkTo="/admin/events"
                />
                <StatCard 
                  label="註冊用戶" 
                  value={stats.totalUsers} 
                  icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                  linkTo="/admin/users"
                />
                <StatCard 
                  label="抽籤登記" 
                  value={stats.totalRegistrations} 
                  icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                  linkTo="/admin/lottery"
                />
                <StatCard 
                  label="待處理付款" 
                  value={stats.pendingPayments} 
                  icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  linkTo="/admin/payments"
                />
                <StatCard 
                  label="已完成付款" 
                  value={stats.completedPayments} 
                  icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  linkTo="/admin/payments"
                />
              </div>

              {/* Quick Actions */}
              <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-lg font-semibold mb-4">快速操作</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <QuickAction 
                    label="創建活動" 
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>}
                    href="/admin/create-event" 
                  />
                  <QuickAction 
                    label="管理活動" 
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>}
                    href="/admin/events" 
                  />
                  <QuickAction 
                    label="執行抽籤" 
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                    href="/admin/lottery/draw" 
                  />
                  <QuickAction 
                    label="查看報表" 
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                    href="/admin/reports" 
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value, icon, linkTo }: DashboardStat) {
  return (
    <Link href={linkTo} className="block bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-gray-500 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        <div className="text-blue-500">
          {icon}
        </div>
      </div>
    </Link>
  );
}

// Quick Action Component
function QuickAction({ label, icon, href }: { label: string, icon: JSX.Element, href: string }) {
  return (
    <Link 
      href={href}
      className="flex flex-col items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
    >
      <div className="text-blue-600 mb-2">{icon}</div>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
