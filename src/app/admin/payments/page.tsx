"use client";

import { useState, useEffect } from 'react';
import AdminPage from '@/components/admin/AdminPage';
import { adminFetch } from '@/utils/adminApi';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Link from 'next/link';
import { formatCurrency, formatDate as formatDateUtil } from '@/utils/formatters'; // Import new formatters
import { useTranslations } from '@/hooks/useTranslations'; // Import useTranslations

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

interface ApiResponseMeta {
  timestamp: string;
  requestId: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// Define fallback response type for backward compatibility
interface LegacyPaymentsResponse {
  payments: Payment[];
}
  
interface EventPaymentGroup {
  eventId: string;
  eventName: string;
  totalPayments: number;
  totalAmount: number;
  completedPayments: number;
  pendingPayments: number;
  failedPayments: number;
  refundedPayments: number;
  payments: Payment[];
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
  const { t, locale } = useTranslations(); // Initialize useTranslations
  const [stats, setStats] = useState<PaymentStats>({
    total: 0,
    completed: 0,
    pending: 0,
    failed: 0,
    totalAmount: 0
  });
  const [groupedPayments, setGroupedPayments] = useState<EventPaymentGroup[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('grouped');

  // Fetch payments data
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await adminFetch<{ 
          success: boolean; 
          data: { payments: Payment[] }; 
          meta?: ApiResponseMeta 
        } | LegacyPaymentsResponse>('/api/admin/payments');
        
        // Handle the new ApiResponseBuilder format
        let paymentsData: Payment[] = [];
        
        if (response && 'success' in response && response.success && response.data && Array.isArray(response.data.payments)) {
          // New ApiResponseBuilder format
          paymentsData = response.data.payments;
        } else if (response && 'payments' in response && Array.isArray(response.payments)) {
          // Old format fallback
          paymentsData = response.payments;
        } else {
          throw new Error(t('errorFetchingData')); // Use translated error
        }
        
        setPayments(paymentsData);
        setFilteredPayments(paymentsData);
        
        // Calculate stats
        const statsData: PaymentStats = {
          total: paymentsData.length,
          completed: paymentsData.filter(p => p.status === 'completed').length,
          pending: paymentsData.filter(p => p.status === 'pending').length,
          failed: paymentsData.filter(p => p.status === 'failed').length,
          totalAmount: paymentsData.reduce((sum, payment) => sum + (payment.amount || 0), 0)
        };
        
        setStats(statsData);
      } catch (err) {
        console.error('Error fetching payments:', err);
        setError(err instanceof Error ? err.message : t('errorFetchingData')); // Use translated error
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [t]); // Added t to dependency array

  // Group payments by event
  useEffect(() => {
    if (payments.length > 0) {
      const grouped = payments.reduce((acc, payment) => {
        const eventId = payment.eventId || 'unknown';
        const eventName = payment.eventName || t('unknownEvent');
        
        if (!acc[eventId]) {
          acc[eventId] = {
            eventId,
            eventName,
            totalPayments: 0,
            totalAmount: 0,
            completedPayments: 0,
            pendingPayments: 0,
            failedPayments: 0,
            refundedPayments: 0,
            payments: []
          };
        }
        
        acc[eventId].payments.push(payment);
        acc[eventId].totalPayments += 1;
        acc[eventId].totalAmount += payment.amount || 0;
        
        switch (payment.status) {
          case 'completed':
            acc[eventId].completedPayments += 1;
            break;
          case 'pending':
            acc[eventId].pendingPayments += 1;
            break;
          case 'failed':
            acc[eventId].failedPayments += 1;
            break;
          case 'refunded':
            acc[eventId].refundedPayments += 1;
            break;
        }
        
        return acc;
      }, {} as Record<string, EventPaymentGroup>);
      
      setGroupedPayments(Object.values(grouped));
    }
  }, [payments , t]);

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

  const toggleEventExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
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
    return formatDateUtil(dateString, undefined, { // Pass undefined to use default locale from formatter
      locale, // Pass current locale
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const localizedFormatCurrency = (amount: number) => {
    return formatCurrency(amount, 'HKD', locale); // Pass current locale
  }

  return (
    <AdminPage 
      title={t('paymentRecords')}
      isLoading={loading}
      error={error}
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">{t('totalTransactions')}</div>
          <div className="text-2xl font-semibold">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">{t('completedTransactions')}</div>
          <div className="text-2xl font-semibold text-green-600">{stats.completed}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">{t('pendingTransactions')}</div>
          <div className="text-2xl font-semibold text-yellow-600">{stats.pending}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">{t('totalRevenue')}</div>
          <div className="text-2xl font-semibold text-blue-600">{localizedFormatCurrency(stats.totalAmount)}</div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              className="w-full p-2 border rounded-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-md p-1">
              <button
                onClick={() => setViewMode('grouped')}
                className={`px-3 py-1 rounded text-sm ${
                  viewMode === 'grouped' 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {t('groupByEvent')}
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded text-sm ${
                  viewMode === 'list' 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {t('listView')}
              </button>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 border rounded-md"
            >
              <option value="all">{t('allStatuses')}</option>
              <option value="completed">{t('completed')}</option>
              <option value="pending">{t('pending')}</option>
              <option value="failed">{t('failed')}</option>
              <option value="refunded">{t('refunded')}</option>
            </select>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="p-2 border rounded-md"
            >
              <option value="all">{t('allTimes')}</option>
              <option value="today">{t('today')}</option>
              <option value="week">{t('thisWeek')}</option>
              <option value="month">{t('thisMonth')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments Display */}
      {viewMode === 'grouped' ? (
        /* Grouped View */
        <div className="space-y-4">
          {groupedPayments.length > 0 ? (
            groupedPayments.map((eventGroup) => (
              <div key={eventGroup.eventId} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Event Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {eventGroup.eventName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {t('eventIdShort', { id: eventGroup.eventId.substring(0, 8) })}...
                      </p>
                    </div>
                    <button
                      onClick={() => toggleEventExpansion(eventGroup.eventId)}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      <span>{t('viewEventDetails')}</span>
                      <svg 
                        className={`w-4 h-4 transition-transform ${
                          expandedEvents.has(eventGroup.eventId) ? 'rotate-180' : ''
                        }`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Event Statistics */}
                <div className="px-6 py-4 bg-blue-50 border-b border-gray-200">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{eventGroup.totalPayments}</div>
                      <div className="text-sm text-gray-600">{t('totalEventTransactions')}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{eventGroup.completedPayments}</div>
                      <div className="text-sm text-gray-600">{t('eventCompleted')}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-yellow-600">{eventGroup.pendingPayments}</div>
                      <div className="text-sm text-gray-600">{t('eventPending')}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">{eventGroup.failedPayments}</div>
                      <div className="text-sm text-gray-600">{t('eventFailed')}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">{localizedFormatCurrency(eventGroup.totalAmount)}</div>
                      <div className="text-sm text-gray-600">{t('eventTotalRevenue')}</div>
                    </div>
                  </div>
                </div>

                {/* Expandable Payment Details */}
                {expandedEvents.has(eventGroup.eventId) && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('paymentIdShort')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('user')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('amount')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('status')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('createdTime')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('actions')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {eventGroup.payments.map((payment) => (
                          <tr key={payment.paymentId} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {payment.paymentId?.substring(0, 8) || t('notApplicable')}...
                              </div>
                              <div className="text-xs text-gray-500">
                                {t('orderIdShort')}: {payment.bookingToken ? payment.bookingToken.substring(0, 8) + '...' : t('notApplicable')}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{payment.userName || t('unknownUser')}</div>
                              <div className="text-xs text-gray-500">
                                {payment.userId ? payment.userId.substring(0, 8) + '...' : t('notApplicable')}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{localizedFormatCurrency(payment.amount)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(payment.status)}`}>
                                {payment.status === 'completed' && t('completed')}
                                {payment.status === 'pending' && t('pending')}
                                {payment.status === 'failed' && t('failed')}
                                {payment.status === 'refunded' && t('refunded')}
                                {!['completed', 'pending', 'failed', 'refunded'].includes(payment.status) && payment.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(payment.createdAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <Link
                                href={`/admin/payments/${payment.paymentId}`}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                {t('viewDetails')}
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-white p-6 rounded-lg shadow text-center">
              <p className="text-gray-500">{t('noPaymentRecordsFound')}</p>
            </div>
          )}
        </div>
      ) : (
        /* Original List View */
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
                    {t('paymentIdShort')}
                    {sortField === 'paymentId' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('userName')}
                  >
                    {t('user')}
                    {sortField === 'userName' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('eventName')}
                  >
                    {t('eventName')}
                    {sortField === 'eventName' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('amount')}
                  >
                    {t('amount')}
                    {sortField === 'amount' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('status')}
                  >
                    {t('status')}
                    {sortField === 'status' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('createdAt')}
                  >
                    {t('createdTime')}
                    {sortField === 'createdAt' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.length > 0 ? (
                  filteredPayments.map((payment) => (
                    <tr key={payment.paymentId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{payment.paymentId?.substring(0, 8) || t('notApplicable')}...</div>
                        <div className="text-xs text-gray-500">{t('orderIdShort')}: {payment.bookingToken ? payment.bookingToken.substring(0, 8) + '...' : t('notApplicable')}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{payment.userName || t('unknownUser')}</div>
                        <div className="text-xs text-gray-500">{payment.userId ? payment.userId.substring(0, 8) + '...' : t('notApplicable')}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{payment.eventName || t('unknownEvent')}</div>
                        <div className="text-xs text-gray-500">{payment.eventId ? payment.eventId.substring(0, 8) + '...' : t('notApplicable')}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{localizedFormatCurrency(payment.amount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(payment.status)}`}>
                          {payment.status === 'completed' && t('completed')}
                          {payment.status === 'pending' && t('pending')}
                          {payment.status === 'failed' && t('failed')}
                          {payment.status === 'refunded' && t('refunded')}
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
                          {t('viewDetails')}
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
                        t('noPaymentRecordsFound')
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminPage>
  );
}
