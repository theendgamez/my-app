"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navbar/Navbar';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate } from '@/utils/formatters';
import { useTranslations } from '@/hooks/useTranslations';

interface Ticket {
  ticketId: string;
  eventId: string;
  eventName: string;
  zone: string;
  seatNumber?: string;
  status: 'available' | 'reserved' | 'sold' | 'used' | 'cancelled';
  paymentId?: string;
  purchaseDate?: string;
  eventDate?: string;
}

export default function UserOrderPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t, locale } = useTranslations(); // Add locale

  // Group tickets by payment ID
  const ticketsByPayment = tickets.reduce((acc, ticket) => {
    const paymentId = ticket.paymentId || 'no-payment-id'; // Fallback for tickets without payment ID
    if (!acc[paymentId]) {
      acc[paymentId] = [];
    }
    acc[paymentId].push(ticket);
    return acc;
  }, {} as Record<string, Ticket[]>);

  const fetchTickets = useCallback(async () => {
    if (!user?.userId) {
      console.error("Cannot fetch tickets: userId is undefined");
      setError(t('authenticationIssue') + ": " + t('missingUserId'));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const accessToken = localStorage.getItem('accessToken');
      const userId = user.userId;

      console.log(`Fetching tickets for user: ${userId}`);

      // Be explicit about constructing the headers to ensure userId is included
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      if (userId) {
        headers['x-user-id'] = userId;
      }

      const response = await fetch(`/api/users/${userId}/tickets`, {
        headers,
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log("Authentication failed, redirecting to login");
          router.push(`/login?redirect=${encodeURIComponent("/user/order")}&auth_error=true`);
          return;
        }

        const errorText = await response.text();
        throw new Error(`Failed to fetch tickets: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`Received ${data.length} tickets`);
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError(err instanceof Error ? err.message : t('loadTicketDataFailed'));
    } finally {
      setLoading(false);
    }
  }, [user?.userId, router, t]);

  useEffect(() => {
    // Check authentication first
    if (!authLoading && !isAuthenticated) {
      console.log("User not authenticated, redirecting to login");
      router.push(`/login?redirect=${encodeURIComponent("/user/order")}`);
      return;
    }

    // Only fetch tickets if user is authenticated and has userId
    if (isAuthenticated && user?.userId) {
      fetchTickets();
    } else if (!authLoading && isAuthenticated && !user?.userId) {
      setError(t('unableToLoadUserInfo'));
      setLoading(false);
    }
  }, [isAuthenticated, user?.userId, authLoading, fetchTickets, router, t]);

  // Modify the getStatusBadge function
  const getStatusBadge = (ticket: Ticket) => {
    // Handle reserved tickets from lottery that need payment
    if (ticket.status === 'reserved') {
      return (
        <div className="flex flex-col items-center">
          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">{t('reserved')}</span>
          <span className="mt-1 text-xs text-red-600">{t('needPayment')}</span>
        </div>
      );
    }

    // Handle other status types
    switch (ticket.status) {
      case "sold":
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">{t('purchased')}</span>;
      case 'used':
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">{t('used')}</span>;
      case 'cancelled':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">{t('cancelled')}</span>;
      default:
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">{t('reserved')}</span>; // Fallback, consider specific key if needed
    }
  };

  // Update the action buttons for tickets
  const renderActions = (ticket: Ticket) => {
    if (ticket.status === 'reserved') {
      // Find registration token if available
      return (
        <div className="flex flex-col space-y-2">
          <Link
            href={`/events/${ticket.eventId}/lottery/payment?ticketId=${ticket.ticketId}`}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {t('completePayment')}
          </Link>
        </div>
      );
    }

    // Regular view details link for other tickets
    return (
      <Link
        href={`/user/order/${ticket.paymentId || ticket.ticketId}`}
        className="text-blue-600 hover:text-blue-800"
      >
        {t('viewDetails')}
      </Link>
    );
  };

  const formatDateWithLocale = (dateString?: string) => {
    if (!dateString) return t('unknown');
    return formatDate(dateString, undefined, { locale });
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4 pt-20">
        <h1 className="text-2xl font-bold mb-6">{t('myTickets')}</h1>

        {authLoading || loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="large" />
          </div>
        ) : error ? (
          <div className="p-4 border border-red-200 bg-red-50 text-red-600 rounded-lg">
            <p>{error}</p>
            <button
              onClick={fetchTickets}
              className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
              disabled={!user?.userId}
            >
              {t('retry')}
            </button>
          </div>
        ) : Object.keys(ticketsByPayment).length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-lg text-gray-600 mb-4">{t('noTicketsYet')}</p>
            <Link href="/events" className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors">
              {t('browseEvents')}
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(ticketsByPayment).map(([paymentId, paymentTickets]) => (
              <div key={paymentId} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-blue-50 p-4 border-b border-blue-100">
                  <h2 className="text-xl font-semibold">
                    {t('purchaseOrderNumber')}: {paymentId === 'no-payment-id' ? t('unassigned') : paymentId.substring(0, 8) + '...'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {t('purchaseTime')}: {formatDateWithLocale(paymentTickets[0].purchaseDate)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {t('activity')}: {paymentTickets[0].eventName}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('ticketNumber')}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('zone')} / {t('seat')}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('purchaseTime')}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('status')}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paymentTickets.map((ticket) => (
                        <tr key={ticket.ticketId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {ticket.ticketId.substring(0, 8)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {ticket.zone} {ticket.seatNumber ? `/ ${ticket.seatNumber}` : ''}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDateWithLocale(ticket.purchaseDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(ticket)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {renderActions(ticket)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}