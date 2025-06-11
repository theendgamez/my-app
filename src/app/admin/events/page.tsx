"use client";

import { useState, useEffect, useCallback } from 'react'; // Added useCallback
import Link from 'next/link';
import AdminPage from '@/components/admin/AdminPage';
import { Events } from '@/types';
import { adminFetch } from '@/utils/adminApi';
import { formatDate as formatDateUtil } from '@/utils/formatters'; // Renamed to avoid conflict
import { useTranslations } from '@/hooks/useTranslations'; // Import useTranslations

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Events[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState<string | null>(null);
  const { t, locale } = useTranslations(); // Initialize useTranslations

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminFetch<Events[] | { events: Events[] }>('/api/events');
      
      // Check if the response is an error object
      if ('error' in data && 'status' in data) {
        throw new Error(`API Error: ${data.error}`);
      }
      
      // Handle both array response and object response
      let eventsArray: Events[];
      if (Array.isArray(data)) {
        eventsArray = data;
      } else if ('events' in data && Array.isArray(data.events)) {
        eventsArray = data.events;
      } else {
        throw new Error('Invalid data format: expected an array of events or events object');
      }
      
      setEvents(eventsArray);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err instanceof Error ? err.message : t('adminErrorFetchingEventsData'));
    } finally {
      setLoading(false);
    }
  }, [t, setLoading, setEvents, setError]); // Added dependencies for useCallback

  // Fetch events
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]); // Added fetchEvents to dependency array

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm(t('adminConfirmDeleteEvent'))) {
      return;
    }

    try {
      setDeleteInProgress(eventId);
      
      await adminFetch(`/api/events/${eventId}`, {
        method: 'DELETE'
      });

      // Remove from UI without refetching
      setEvents(events.filter(event => event.eventId !== eventId));
    } catch (err) {
      console.error('Error deleting event:', err);
      setError(err instanceof Error ? err.message : t('adminErrorDeletingEvent'));
    } finally {
      setDeleteInProgress(null);
    }
  };

  // Create action button component
  const actionButton = (
    <Link
      href="/admin/create-event"
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
    >
      {t('adminCreateNewEvent')}
    </Link>
  );

  return (
    <AdminPage 
      title={t('adminManageEvents')}
      isLoading={loading}
      error={error}
      actionButton={actionButton}
    >
      {/* Check if events is an array and has length before trying to map over it */}
      {Array.isArray(events) && events.length === 0 && !loading ? (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-gray-600 mb-4">{t('adminNoEventsYet')}</p>
          <Link
            href="/admin/create-event"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {t('adminCreateFirstEvent')}
          </Link>
        </div>
      ) : Array.isArray(events) && events.length > 0 ? (
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('eventName')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('date')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('location')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('salesMode')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {events.map((event) => (
                <tr key={event.eventId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{event.eventName}</div>
                    <div className="text-xs text-gray-500">{event.eventId.substring(0, 8)}...</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {event.eventDate ? formatDateUtil(event.eventDate, undefined, { locale, year: 'numeric', month: '2-digit', day: '2-digit' }) : t('notApplicable')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {event.eventDate ? formatDateUtil(event.eventDate, undefined, { locale, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{event.location}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      event.isDrawMode ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {event.isDrawMode ? t('drawMode') : t('directSale')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Link
                        href={`/events/${event.eventId}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        {t('view')}
                      </Link>
                      <Link
                        href={`/admin/events/edit/${event.eventId}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        {t('edit')}
                      </Link>
                      <button
                        onClick={() => handleDeleteEvent(event.eventId)}
                        disabled={deleteInProgress === event.eventId}
                        className={`text-red-600 hover:text-red-900 ${deleteInProgress === event.eventId ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {deleteInProgress === event.eventId ? t('deleting') : t('delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !loading && error ? (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-red-600 mb-4">{t('adminErrorLoadingEvents')}</p>
          <button 
            onClick={fetchEvents}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {t('retry')}
          </button>
        </div>
      ) : null }
    </AdminPage>
  );
}
