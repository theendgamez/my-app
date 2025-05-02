"use client";

import { useState, useEffect } from 'react';
import AdminPage from '@/components/admin/AdminPage';
import { adminFetch } from '@/utils/adminApi';
import { Payment } from '@/types';



interface ReportStats {
  totalRevenue: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  paymentsByStatus: {
    completed: number;
    pending: number;
    failed: number;
    refunded: number;
  };
  paymentsByMonth: {
    month: string;
    revenue: number;
  }[];
}

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ReportStats>({
    totalRevenue: 0,
    thisMonthRevenue: 0,
    lastMonthRevenue: 0,
    paymentsByStatus: {
      completed: 0,
      pending: 0,
      failed: 0,
      refunded: 0
    },
    paymentsByMonth: []
  });
  
  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all payments
        const data = await adminFetch<{ payments: Payment[] }>('/api/admin/payments');
        
        if (data && Array.isArray(data.payments)) {
          // Calculate basic report statistics from payment data
          const payments = data.payments;
          const today = new Date();
          const thisMonth = today.getMonth();
          const thisYear = today.getFullYear();
          const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
          const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
          
          // Calculate revenue metrics
          const totalRevenue = payments
            .filter(p => p.status === 'completed')
            .reduce((sum, p) => sum + (p.amount || 0), 0);
          
          const thisMonthRevenue = payments
            .filter(p => p.status === 'completed' && 
                   new Date(p.createdAt).getMonth() === thisMonth &&
                   new Date(p.createdAt).getFullYear() === thisYear)
            .reduce((sum, p) => sum + (p.amount || 0), 0);
            
          const lastMonthRevenue = payments
            .filter(p => p.status === 'completed' && 
                   new Date(p.createdAt).getMonth() === lastMonth &&
                   new Date(p.createdAt).getFullYear() === lastMonthYear)
            .reduce((sum, p) => sum + (p.amount || 0), 0);
            
          // Count payments by status
          const paymentsByStatus = {
            completed: payments.filter(p => p.status === 'completed').length,
            pending: payments.filter(p => p.status === 'pending').length,
            failed: payments.filter(p => p.status === 'failed').length,
            refunded: payments.filter(p => p.status === 'refunded').length
          };
          
          // Generate monthly payment data for the last 6 months
          const paymentsByMonth = Array(6).fill(0).map((_, i) => {
            const monthIndex = (thisMonth - i + 12) % 12;
            const monthYear = thisMonth - i < 0 ? thisYear - 1 : thisYear;
            
            const revenue = payments
              .filter(p => p.status === 'completed' && 
                     new Date(p.createdAt).getMonth() === monthIndex &&
                     new Date(p.createdAt).getFullYear() === monthYear)
              .reduce((sum, p) => sum + (p.amount || 0), 0);
              
            const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', 
                               '七月', '八月', '九月', '十月', '十一月', '十二月'];
            
            return {
              month: `${monthNames[monthIndex]} ${monthYear}`,
              revenue
            };
          }).reverse();
          
          setStats({
            totalRevenue,
            thisMonthRevenue,
            lastMonthRevenue,
            paymentsByStatus,
            paymentsByMonth
          });
        } else {
          throw new Error('獲取到的支付數據格式不正確');
        }
      } catch (err) {
        console.error('Error fetching report data:', err);
        setError(err instanceof Error ? err.message : '獲取報告數據時出錯');
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-HK', {
      style: 'currency',
      currency: 'HKD'
    }).format(amount);
  };

  return (
    <AdminPage 
      title="財務報告" 
      isLoading={loading}
      error={error}
    >
      {/* Revenue Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">總收入</div>
          <div className="text-2xl font-semibold text-blue-600">{formatCurrency(stats.totalRevenue)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">本月收入</div>
          <div className="text-2xl font-semibold text-green-600">{formatCurrency(stats.thisMonthRevenue)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">上月收入</div>
          <div className="text-2xl font-semibold text-gray-600">{formatCurrency(stats.lastMonthRevenue)}</div>
        </div>
      </div>

      {/* Transaction Statistics */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">交易狀態概覽</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-green-50 rounded-lg text-center">
            <div className="text-sm text-green-600">已完成交易</div>
            <div className="text-2xl font-bold text-green-700">{stats.paymentsByStatus.completed}</div>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg text-center">
            <div className="text-sm text-yellow-600">處理中交易</div>
            <div className="text-2xl font-bold text-yellow-700">{stats.paymentsByStatus.pending}</div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg text-center">
            <div className="text-sm text-red-600">失敗交易</div>
            <div className="text-2xl font-bold text-red-700">{stats.paymentsByStatus.failed}</div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg text-center">
            <div className="text-sm text-purple-600">退款交易</div>
            <div className="text-2xl font-bold text-purple-700">{stats.paymentsByStatus.refunded}</div>
          </div>
        </div>
      </div>

      {/* Monthly Revenue Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-6">最近六個月收入</h2>
        
        {/* Simple bar chart visualization */}
        <div className="h-64">
          <div className="flex items-end h-48 space-x-2">
            {stats.paymentsByMonth.map((monthData, index) => {
              // Calculate the percentage for the bar height (max 100%)
              const maxRevenue = Math.max(...stats.paymentsByMonth.map(m => m.revenue), 1);
              const heightPercent = (monthData.revenue / maxRevenue) * 100;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex justify-center items-end h-full">
                    <div 
                      className="w-full bg-blue-500 rounded-t"
                      style={{height: `${heightPercent}%`}}
                    ></div>
                  </div>
                  <div className="mt-2 text-xs text-gray-600 w-full text-center">
                    {monthData.month.split(' ')[0]}
                  </div>
                  <div className="text-xs font-medium text-gray-900">
                    {formatCurrency(monthData.revenue)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Development Notice */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              財務報告功能正在開發中，更多詳細的報表和分析即將推出。
            </p>
          </div>
        </div>
      </div>
    </AdminPage>
  );
}
