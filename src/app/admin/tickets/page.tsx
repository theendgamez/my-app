"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminPage from '@/components/admin/AdminPage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import { Ticket} from '@/types';



export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [eventFilter, setEventFilter] = useState('all');
  const [sortField, setSortField] = useState<string>('purchaseDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [uniqueEvents, setUniqueEvents] = useState<{id: string, name: string}[]>([]);
  
  const router = useRouter();
  const { isAuthenticated, isAdmin } = useAuth();
  
  // Fetch tickets
  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/admin/tickets', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
          },
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch tickets: ${response.status}`);
        }
        
        const data = await response.json();
        setTickets(data.tickets || []);
        
        // Extract unique events for filter dropdown
        const events = [
          ...new Map(
            data.tickets.map((ticket: Ticket) => [
              ticket.eventId, 
              { id: ticket.eventId, name: ticket.eventName }
            ])
          ).values()
        ] as { id: string, name: string }[];
        
        setUniqueEvents(events);
      } catch (error) {
        console.error('Error fetching tickets:', error);
        setError('獲取票券數據失敗');
      } finally {
        setLoading(false);
      }
    };
    
    if (isAuthenticated && isAdmin) {
      fetchTickets();
    }
  }, [isAuthenticated, isAdmin]);
  
  // Redirect if not admin
  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/');
    }
  }, [loading, isAdmin, router]);

  // Handle sort
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle ticket status change
  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    if (!confirm(`確定要將此票券狀態更改為 ${newStatus}？`)) {
      return;
    }
    
    setActionInProgress(ticketId);
    
    try {
      const response = await fetch(`/api/admin/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update ticket status: ${response.status}`);
      }
      
      // Update ticket in the list
      setTickets(tickets.map(ticket => 
        ticket.ticketId === ticketId ? { ...ticket, status: newStatus as Ticket['status'] } : ticket
      ));
    } catch (error) {
      console.error('Error updating ticket status:', error);
      setError('更新票券狀態失敗');
    } finally {
      setActionInProgress(null);
    }
  };

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    // Apply search query filter
    const matchesSearch = 
      (ticket.ticketId.toLowerCase()).includes(searchQuery.toLowerCase()) ||
      (ticket.eventName.toLowerCase()).includes(searchQuery.toLowerCase()) ||
      ((ticket.userRealName || '未提供姓名').toLowerCase()).includes(searchQuery.toLowerCase()) ||
      (ticket.userId.toLowerCase()).includes(searchQuery.toLowerCase()) ||
      (ticket.seatNumber?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    
    // Apply status filter
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    
    // Apply event filter
    const matchesEvent = eventFilter === 'all' || ticket.eventId === eventFilter;
    
    return matchesSearch && matchesStatus && matchesEvent;
  });

  // Apply sorting
  const sortedTickets = [...filteredTickets].sort((a, b) => {
    let fieldA = a[sortField as keyof Ticket];
    let fieldB = b[sortField as keyof Ticket];
    
    // Handle undefined fields
    fieldA = fieldA || '';
    fieldB = fieldB || '';
    
    // Handle date comparisons
    if (sortField === 'eventDate' || sortField === 'purchaseDate' || sortField === 'transferredAt') {
      const dateA = new Date(fieldA as string).getTime();
      const dateB = new Date(fieldB as string).getTime();
      
      if (sortDirection === 'asc') {
        return dateA - dateB;
      } else {
        return dateB - dateA;
      }
    }
    
    // Compare based on direction
    if (sortDirection === 'asc') {
      return fieldA < fieldB ? -1 : fieldA > fieldB ? 1 : 0;
    } else {
      return fieldA > fieldB ? -1 : fieldA < fieldB ? 1 : 0;
    }
  });

  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-blue-100 text-blue-800';
      case 'reserved':
        return 'bg-yellow-100 text-yellow-800';
      case 'sold':
        return 'bg-green-100 text-green-800';
      case 'used':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('zh-HK');
  };

  // Translate status to Chinese
  const translateStatus = (status: string) => {
    switch (status) {
      case 'available': return '可用';
      case 'reserved': return '預留中';
      case 'sold': return '已售出';
      case 'used': return '已使用';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  return (
    <AdminPage 
      title="票券管理" 
      isLoading={loading}
      error={error}
    >
      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜索票券ID、活動名稱、用戶名稱..."
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
              <option value="available">可用</option>
              <option value="reserved">預留中</option>
              <option value="sold">已售出</option>
              <option value="used">已使用</option>
              <option value="cancelled">已取消</option>
            </select>
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="p-2 border rounded-md"
            >
              <option value="all">所有活動</option>
              {uniqueEvents.map(event => (
                <option key={event.id} value={event.id}>{event.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('ticketId')}
                >
                  票券ID
                  {sortField === 'ticketId' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('eventName')}
                >
                  活動名稱
                  {sortField === 'eventName' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('eventDate')}
                >
                  活動日期
                  {sortField === 'eventDate' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('userRealName')}
                >
                  用戶
                  {sortField === 'userRealName' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('zone')}
                >
                  區域/座位
                  {sortField === 'zone' && (
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
                  onClick={() => handleSort('purchaseDate')}
                >
                  購買日期
                  {sortField === 'purchaseDate' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedTickets.length > 0 ? (
                sortedTickets.map((ticket) => (
                  <tr key={ticket.ticketId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {ticket.ticketId.substring(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{ticket.eventName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(ticket.eventDate)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{ticket.userRealName || '未提供姓名'}</div>
                      <div className="text-xs text-gray-500">{ticket.userId.substring(0, 8)}...</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{ticket.zone}</div>
                      <div className="text-xs text-gray-500">座位: {ticket.seatNumber || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(ticket.status)}`}>
                        {translateStatus(ticket.status)}
                      </span>
                      {ticket.transferredAt && (
                        <div className="text-xs text-gray-500 mt-1">
                          已轉贈 ({formatDate(ticket.transferredAt)})
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(ticket.purchaseDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-col space-y-2">
                        <Link
                          href={`/admin/tickets/${ticket.ticketId}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          查看
                        </Link>
                        {ticket.status !== 'used' && (
                          <button
                            onClick={() => handleStatusChange(ticket.ticketId, 'used')}
                            disabled={actionInProgress === ticket.ticketId}
                            className={`text-green-600 hover:text-green-900 ${actionInProgress === ticket.ticketId ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            驗證使用
                          </button>
                        )}
                        {ticket.status !== 'cancelled' && (
                          <button
                            onClick={() => handleStatusChange(ticket.ticketId, 'cancelled')}
                            disabled={actionInProgress === ticket.ticketId}
                            className={`text-red-600 hover:text-red-900 ${actionInProgress === ticket.ticketId ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            作廢
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500 text-sm">
                    {loading ? (
                      <div className="flex justify-center py-4">
                        <LoadingSpinner size="small" />
                      </div>
                    ) : (
                      '沒有找到匹配的票券'
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
