"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminPage from '@/components/admin/AdminPage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import { Ticket} from '@/types';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { formatDate as formatDateUtil } from '@/utils/formatters';
import { useTranslations } from '@/hooks/useTranslations';


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
  const [collapsedEvents, setCollapsedEvents] = useState<Set<string>>(new Set());
  const { t, locale } = useTranslations(); // Correctly destructure t and locale
  
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
        
        // Handle both new ApiResponseBuilder format and legacy format
        let ticketsData: Ticket[] = [];
        
        if (data && data.success && data.data && Array.isArray(data.data.tickets)) {
          // New ApiResponseBuilder format
          ticketsData = data.data.tickets;
        } else if (data && Array.isArray(data.tickets)) {
          // Legacy format
          ticketsData = data.tickets;
        } else {
          throw new Error('Invalid tickets data format received');
        }
        
        setTickets(ticketsData);
        
        // Extract unique events for filter dropdown
        const events = [
          ...new Map(
            ticketsData.map((ticket: Ticket) => [
              ticket.eventId, 
              { id: ticket.eventId, name: ticket.eventName }
            ])
          ).values()
        ] as { id: string, name: string }[];
        
        setUniqueEvents(events);
      } catch (error) {
        console.error('Error fetching tickets:', error);
        setError(t('adminErrorFetchingTickets'));
      } finally {
        setLoading(false);
      }
    };
    
    if (isAuthenticated && isAdmin) {
      fetchTickets();
    }
  }, [isAuthenticated, isAdmin, t, setLoading, setError, setTickets, setUniqueEvents]);
  
  // Redirect if not admin
  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/');
    }
  }, [loading, isAdmin, router]);

  // Toggle event collapse
  const toggleEventCollapse = (eventId: string) => {
    const newCollapsed = new Set(collapsedEvents);
    if (newCollapsed.has(eventId)) {
      newCollapsed.delete(eventId);
    } else {
      newCollapsed.add(eventId);
    }
    setCollapsedEvents(newCollapsed);
  };

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
    const statusKey = `status${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`;
    if (!confirm(t('adminConfirmTicketStatusChange', { status: t(statusKey) }))) {
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
      setError(t('adminErrorUpdatingTicketStatus'));
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

  // Group tickets by event
  const groupedTickets = filteredTickets.reduce((groups, ticket) => {
    const eventId = ticket.eventId;
    if (!groups[eventId]) {
      groups[eventId] = {
        eventInfo: {
          id: eventId,
          name: ticket.eventName,
          date: ticket.eventDate
        },
        tickets: []
      };
    }
    groups[eventId].tickets.push(ticket);
    return groups;
  }, {} as Record<string, { eventInfo: { id: string, name: string, date: string }, tickets: Ticket[] }>);

  // Sort tickets within each group
  Object.keys(groupedTickets).forEach(eventId => {
    groupedTickets[eventId].tickets.sort((a, b) => {
      let fieldA = a[sortField as keyof Ticket];
      let fieldB = b[sortField as keyof Ticket];
      
      fieldA = fieldA || '';
      fieldB = fieldB || '';
      
      if (sortField === 'eventDate' || sortField === 'purchaseDate' || sortField === 'transferredAt') {
        const dateA = new Date(fieldA as string).getTime();
        const dateB = new Date(fieldB as string).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
      if (sortDirection === 'asc') {
        return fieldA < fieldB ? -1 : fieldA > fieldB ? 1 : 0;
      } else {
        return fieldA > fieldB ? -1 : fieldA < fieldB ? 1 : 0;
      }
    });
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
    if (!dateString) return t('notApplicable');
    return formatDateUtil(dateString, undefined, { locale }); // Pass locale to formatter
  };

  // Get status translation key
  const getStatusTranslationKey = (status: string): string => {
    return `status${status.charAt(0).toUpperCase() + status.slice(1)}`;
  }

  return (
    <AdminPage 
      title={t('adminTicketManagement')}
      isLoading={loading}
      error={error}
    >
      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t('adminSearchTicketsPlaceholder')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[140px]"
            >
              <option value="all">{t('allStatuses')}</option>
              <option value="available">{t('statusAvailable')}</option>
              <option value="reserved">{t('statusReserved')}</option>
              <option value="sold">{t('statusSold')}</option>
              <option value="used">{t('statusUsed')}</option>
              <option value="cancelled">{t('statusCancelled')}</option>
            </select>
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[140px]"
            >
              <option value="all">{t('allEvents')}</option>
              {uniqueEvents.map(event => (
                <option key={event.id} value={event.id}>{event.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grouped Tickets */}
      <div className="space-y-6">
        {Object.keys(groupedTickets).length > 0 ? (
          Object.entries(groupedTickets).map(([eventId, { eventInfo, tickets }]) => (
            <div key={eventId} className="bg-white rounded-lg shadow-sm border overflow-hidden">
              {/* Event Header */}
              <div 
                className="bg-gray-50 px-6 py-4 border-b cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleEventCollapse(eventId)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{eventInfo.name}</h3>
                    <p className="text-sm text-gray-600">
                      {formatDate(eventInfo.date)} • {t('ticketCount', { count: tickets.length })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                      {['available', 'reserved', 'sold', 'used', 'cancelled'].map(status => {
                        const count = tickets.filter(t => t.status === status).length;
                        if (count > 0) {
                          return (
                            <span 
                              key={status}
                              className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(status)}`}
                            >
                              {t(getStatusTranslationKey(status))}: {count}
                            </span>
                          );
                        }
                        return null;
                      })}
                    </div>
                    {collapsedEvents.has(eventId) ? <FiChevronDown /> : <FiChevronUp />}
                  </div>
                </div>
              </div>

              {/* Tickets Table/Cards */}
              {!collapsedEvents.has(eventId) && (
                <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('ticketId')}
                          >
                            {t('ticketIdLabel')}
                            {sortField === 'ticketId' && (
                              <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </th>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('userRealName')}
                          >
                            {t('user')}
                            {sortField === 'userRealName' && (
                              <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </th>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('zone')}
                          >
                            {t('zoneSeatLabel')}
                            {sortField === 'zone' && (
                              <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </th>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('status')}
                          >
                            {t('status')}
                            {sortField === 'status' && (
                              <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </th>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('purchaseDate')}
                          >
                            {t('purchaseDateLabel')}
                            {sortField === 'purchaseDate' && (
                              <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('actions')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {tickets.map((ticket) => (
                          <tr key={ticket.ticketId} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-mono text-gray-900">
                                {ticket.ticketId.substring(0, 8)}...
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{ticket.userRealName || t('nameNotProvided')}</div>
                              <div className="text-xs text-gray-500 font-mono">{ticket.userId.substring(0, 8)}...</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{ticket.zone}</div>
                              <div className="text-xs text-gray-500">{t('seatLabel')}: {ticket.seatNumber || t('notApplicable')}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${getStatusBadgeClass(ticket.status)}`}>
                                {t(getStatusTranslationKey(ticket.status))}
                              </span>
                              {ticket.transferredAt && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {t('transferred')} ({formatDate(ticket.transferredAt)})
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(ticket.purchaseDate)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/admin/tickets/${ticket.ticketId}`}
                                  className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                                >
                                  {t('view')}
                                </Link>
                                {ticket.status !== 'used' && (
                                  <button
                                    onClick={() => handleStatusChange(ticket.ticketId, 'used')}
                                    disabled={actionInProgress === ticket.ticketId}
                                    className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors ${actionInProgress === ticket.ticketId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    {t('validate')}
                                  </button>
                                )}
                                {ticket.status !== 'cancelled' && (
                                  <button
                                    onClick={() => handleStatusChange(ticket.ticketId, 'cancelled')}
                                    disabled={actionInProgress === ticket.ticketId}
                                    className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors ${actionInProgress === ticket.ticketId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    {t('void')}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Mobile Card View */}
                  <div className="lg:hidden divide-y divide-gray-200">
                    {tickets.map((ticket) => (
                      <div key={ticket.ticketId} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{ticket.userRealName || t('nameNotProvided')}</h4>
                            <p className="text-xs text-gray-500 font-mono mt-1">
                              {ticket.ticketId.substring(0, 8)}...
                            </p>
                          </div>
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${getStatusBadgeClass(ticket.status)}`}>
                            {t(getStatusTranslationKey(ticket.status))}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                          <div>
                            <span className="text-gray-500">{t('zone')}:</span> {ticket.zone}
                          </div>
                          <div>
                            <span className="text-gray-500">{t('seatLabel')}:</span> {ticket.seatNumber || t('notApplicable')}
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-500">{t('purchaseDateLabel')}:</span> {formatDate(ticket.purchaseDate)}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Link
                            href={`/admin/tickets/${ticket.ticketId}`}
                            className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-md text-sm font-medium text-center hover:bg-blue-200 transition-colors"
                          >
                            {t('view')}
                          </Link>
                          
                          {ticket.status !== 'used' && (
                            <button
                              onClick={() => handleStatusChange(ticket.ticketId, 'used')}
                              disabled={actionInProgress === ticket.ticketId}
                              className={`flex-1 px-3 py-2 bg-green-100 text-green-700 rounded-md text-sm font-medium hover:bg-green-200 transition-colors ${actionInProgress === ticket.ticketId ? 'opacity-50' : ''}`}
                            >
                              {t('validate')}
                            </button>
                          )}
                          
                          {ticket.status !== 'cancelled' && (
                            <button
                              onClick={() => handleStatusChange(ticket.ticketId, 'cancelled')}
                              disabled={actionInProgress === ticket.ticketId}
                              className={`flex-1 px-3 py-2 bg-red-100 text-red-700 rounded-md text-sm font-medium hover:bg-red-200 transition-colors ${actionInProgress === ticket.ticketId ? 'opacity-50' : ''}`}
                            >
                              {t('void')}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="large" />
              </div>
            ) : (
              <div className="text-gray-500">
                <p className="text-lg mb-2">{t('adminNoMatchingTickets')}</p>
                <p className="text-sm">{t('adminAdjustSearchFilters')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminPage>
  );
}
