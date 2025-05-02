"use client";

import { useState, useEffect } from 'react';
import AdminPage from '@/components/admin/AdminPage';
import { adminFetch } from '@/utils/adminApi';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Link from 'next/link';

interface Payment {
  paymentId: string;
  userId: string;
  userName?: string;
  bookingToken: string;
  eventId: string;
  eventName?: string;
  amount: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
  method?: string;
}

interface PaymentStats {
  total: number;
  completed: number;
  pending: number;
  failed: number;
  totalAmount: number;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stats, setStats] = useState<PaymentStats>({
    total: 0,
    completed: 0,
    pending: 0,
    failed: 0,
    totalAmount: 0
  });

  // Fetch payments data
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await adminFetch<{ payments: Payment[] }>('/api/admin/payments');
        
        if (data && Array.isArray(data.payments)) {
          setPayments(data.payments);
          setFilteredPayments(data.payments);
          
          // Calculate stats
          const statsData: PaymentStats = {
            total: data.payments.length,
            completed: data.payments.filter(p => p.status === 'completed').length,
            pending: data.payments.filter(p => p.status === 'pending').length,
            failed: data.payments.filter(p => p.status === 'failed').length,
            totalAmount: data.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0)
          };
          
          setStats(statsData);
        } else {
          throw new Error('獲取到的付款數據格式不正確');
        }
      } catch (err) {
        console.error('Error fetching payments:', err);
        setError(err instanceof Error ? err.message : '獲取付款記錄時發生錯誤');
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  // Filter and sort payments
  useEffect(() => {
    let result = [...payments];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(payment => payment.status === statusFilter);
    }
    
    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (dateFilter === 'today') {
        result = result.filter(payment => new Date(payment.createdAt) >= today);
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        result = result.filter(payment => new Date(payment.createdAt) >= weekAgo);
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        result = result.filter(payment => new Date(payment.createdAt) >= monthAgo);
      }
    }
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(payment => 
        payment.paymentId?.toLowerCase().includes(query) ||
        payment.bookingToken?.toLowerCase().includes(query) ||
        payment.userName?.toLowerCase().includes(query) ||
        payment.eventName?.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      const valA = a[sortField as keyof Payment];
      const valB = b[sortField as keyof Payment];
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        if (sortDirection === 'asc') {
          return valA.localeCompare(valB);
        } else {
          return valB.localeCompare(valA);
        }
      } else if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      } else {
        // Fallback to string comparison if types don't match
        return sortDirection === 'asc' 
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      }
    });
    
    setFilteredPayments(result);
  }, [payments, sortField, sortDirection, statusFilter, dateFilter, searchQuery]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-HK', {
      style: 'currency',
      currency: 'HKD'
    }).format(amount);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-HK', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AdminPage 
      title="支付記錄" 
      isLoading={loading}
      error={error}
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">總交易數</div>
          <div className="text-2xl font-semibold">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">已完成交易</div>
          <div className="text-2xl font-semibold text-green-600">{stats.completed}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">待處理交易</div>
          <div className="text-2xl font-semibold text-yellow-600">{stats.pending}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">總收入</div>
          <div className="text-2xl font-semibold text-blue-600">{formatCurrency(stats.totalAmount)}</div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜索支付ID、訂單ID、用戶或活動..."
              className="w-full p-2 border rounded-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 border rounded-md"
            >
              <option value="all">所有狀態</option>
              <option value="completed">已完成</option>
              <option value="pending">處理中</option>
              <option value="failed">失敗</option>
              <option value="refunded">已退款</option>
            </select>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="p-2 border rounded-md"
            >
              <option value="all">所有時間</option>
              <option value="today">今天</option>
              <option value="week">本週</option>
              <option value="month">本月</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('paymentId')}
                >
                  支付ID
                  {sortField === 'paymentId' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('userName')}
                >
                  用戶
                  {sortField === 'userName' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('eventName')}
                >
                  活動
                  {sortField === 'eventName' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('amount')}
                >
                  金額
                  {sortField === 'amount' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('status')}
                >
                  狀態
                  {sortField === 'status' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('createdAt')}
                >
                  建立時間
                  {sortField === 'createdAt' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => (
                  <tr key={payment.paymentId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{payment.paymentId?.substring(0, 8) || 'N/A'}...</div>
                      <div className="text-xs text-gray-500">訂單: {payment.bookingToken ? payment.bookingToken.substring(0, 8) + '...' : 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{payment.userName || '未知用戶'}</div>
                      <div className="text-xs text-gray-500">{payment.userId ? payment.userId.substring(0, 8) + '...' : 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{payment.eventName || '未知活動'}</div>
                      <div className="text-xs text-gray-500">{payment.eventId ? payment.eventId.substring(0, 8) + '...' : 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{formatCurrency(payment.amount)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(payment.status)}`}>
                        {payment.status === 'completed' && '已完成'}
                        {payment.status === 'pending' && '處理中'}
                        {payment.status === 'failed' && '失敗'}
                        {payment.status === 'refunded' && '已退款'}
                        {!['completed', 'pending', 'failed', 'refunded'].includes(payment.status) && payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(payment.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/admin/payments/${payment.paymentId}`}
                        className="text-indigo-600 hover:text-indigo-900 mr-2"
                      >
                        查看詳情
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500 text-sm">
                    {loading ? (
                      <div className="flex justify-center py-4">
                        <LoadingSpinner size="medium" />
                      </div>
                    ) : (
                      '沒有找到支付記錄'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminPage>
  );
}
