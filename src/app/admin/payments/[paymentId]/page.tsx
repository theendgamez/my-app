"use client";

import { useState, useEffect } from 'react';
import { useParams} from 'next/navigation';
import Link from 'next/link';
import AdminPage from '@/components/admin/AdminPage';
import { adminFetch } from '@/utils/adminApi';
import { formatCurrency, formatDate } from '@/utils/formatters';

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
  paymentDetails?: Record<string, unknown>;
}

interface Ticket {
  ticketId: string;
  eventId: string;
  zone: string;
  seatNumber?: string;
  status: string;
  userId: string;
}

export default function PaymentDetailPage() {
  const { paymentId } = useParams();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch payment details
        const data = await adminFetch<{ payment: Payment; tickets: Ticket[] }>(
          `/api/admin/payments/${paymentId}`
        );

        if (data && data.payment) {
          setPayment(data.payment);
          setTickets(data.tickets || []);
        } else {
          throw new Error('獲取到的付款數據格式不正確');
        }
      } catch (err) {
        console.error('Error fetching payment details:', err);
        setError(err instanceof Error ? err.message : '獲取付款詳情時發生錯誤');
      } finally {
        setLoading(false);
      }
    };

    if (paymentId) {
      fetchPaymentDetails();
    }
  }, [paymentId]);


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

  const handleStatusUpdate = async (newStatus: string) => {
    if (processingAction) return;

    try {
      setProcessingAction(newStatus);
      
      await adminFetch(`/api/admin/payments/${paymentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      // Update the payment status locally
      setPayment(prev => prev ? { ...prev, status: newStatus } : null);
      
      // Optional: Show success message
      alert(`支付狀態已更新為: ${newStatus}`);
    } catch (err) {
      console.error('Error updating payment status:', err);
      setError(err instanceof Error ? err.message : '更新付款狀態時發生錯誤');
    } finally {
      setProcessingAction(null);
    }
  };

  return (
    <AdminPage
      title="支付詳情"
      isLoading={loading}
      error={error}
      actionButton={
        <Link
          href="/admin/payments"
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          返回列表
        </Link>
      }
    >
      {payment && (
        <div className="space-y-6">
          {/* Payment Status Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <h2 className="text-xl font-semibold">支付 #{payment.paymentId.substring(0, 8)}</h2>
                <span className={`mt-2 px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(payment.status)}`}>
                  {payment.status === 'completed' && '已完成'}
                  {payment.status === 'pending' && '處理中'}
                  {payment.status === 'failed' && '失敗'}
                  {payment.status === 'refunded' && '已退款'}
                  {!['completed', 'pending', 'failed', 'refunded'].includes(payment.status) && payment.status}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {payment.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleStatusUpdate('completed')}
                      disabled={processingAction !== null}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                    >
                      {processingAction === 'completed' ? '處理中...' : '標記為已完成'}
                    </button>
                    <button
                      onClick={() => handleStatusUpdate('failed')}
                      disabled={processingAction !== null}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                    >
                      {processingAction === 'failed' ? '處理中...' : '標記為失敗'}
                    </button>
                  </>
                )}
                {payment.status === 'completed' && (
                  <button
                    onClick={() => handleStatusUpdate('refunded')}
                    disabled={processingAction !== null}
                    className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
                  >
                    {processingAction === 'refunded' ? '處理中...' : '退款'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">支付詳情</h3>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500">支付ID</dt>
                  <dd className="mt-1 text-sm text-gray-900">{payment.paymentId}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">金額</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-semibold">
                    {formatCurrency(payment.amount, '免費票券')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">訂單ID</dt>
                  <dd className="mt-1 text-sm text-gray-900">{payment.bookingToken}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">支付方式</dt>
                  <dd className="mt-1 text-sm text-gray-900">{payment.method || '信用卡'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">創建時間</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(payment.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">上次更新</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {payment.updatedAt ? formatDate(payment.updatedAt) : '無更新記錄'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* User Information */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">用戶信息</h3>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500">用戶ID</dt>
                  <dd className="mt-1 text-sm text-gray-900">{payment.userId}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">用戶名稱</dt>
                  <dd className="mt-1 text-sm text-gray-900">{payment.userName || '未知用戶'}</dd>
                </div>
              </dl>
              <div className="mt-4">
                <Link
                  href={`/admin/users/${payment.userId}`}
                  className="text-indigo-600 hover:text-indigo-900 text-sm"
                >
                  查看用戶詳情 →
                </Link>
              </div>
            </div>
          </div>

          {/* Event Information */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">活動信息</h3>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500">活動ID</dt>
                  <dd className="mt-1 text-sm text-gray-900">{payment.eventId}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">活動名稱</dt>
                  <dd className="mt-1 text-sm text-gray-900">{payment.eventName || '未知活動'}</dd>
                </div>
              </dl>
              <div className="mt-4">
                <Link
                  href={`/admin/events/edit/${payment.eventId}`}
                  className="text-indigo-600 hover:text-indigo-900 text-sm"
                >
                  查看活動詳情 →
                </Link>
              </div>
            </div>
          </div>

          {/* Tickets Information */}
          {tickets.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-semibold">票券 ({tickets.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        票券ID
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        區域
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        座位号
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        狀態
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tickets.map((ticket) => (
                      <tr key={ticket.ticketId}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {ticket.ticketId.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {ticket.zone}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {ticket.seatNumber || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            ticket.status === 'active' ? 'bg-green-100 text-green-800' : 
                            ticket.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {ticket.status === 'active' && '有效'}
                            {ticket.status === 'cancelled' && '已取消'}
                            {ticket.status === 'used' && '已使用'}
                            {!['active', 'cancelled', 'used'].includes(ticket.status) && ticket.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link
                            href={`/admin/tickets/${ticket.ticketId}`}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            查看詳情
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminPage>
  );
}
