'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/navbar/Navbar';
import Events from '@/components/eventCompo/EventComponents';
import { Events as EventType } from '@/types';

export default function EventsPage() {
  const [events, setEvents] = useState<EventType[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);

        const response = await fetch('/api/events');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch events: ${response.status}`);
        }
        
        const data = await response.json();
        setEvents(data);
        setFilteredEvents(data);
      } catch (error) {
        console.error('Failed to fetch events:', error);
        setError(error instanceof Error ? error.message : 'Failed to load events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Filter events when search query changes
  useEffect(() => {
    const filtered = events.filter(event =>
      event.eventName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredEvents(filtered);
  }, [searchQuery, events]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-20">
        <div className="container mx-auto px-6 lg:px-8">
          <h1 className="text-3xl text font-boldmb-12">活動</h1>
          <div className="max-w-xl mx-auto mb-12">
            <input
              type="text"
              name="search"
              id="search"
              placeholder="搜尋活動"
              className="w-full p-4 border rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
          ) : error ? (
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <p className="text-red-600">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                重試
              </button>
            </div>
          ) : (
            <Events events={filteredEvents} />
          )}
        </div>
      </main>
    </div>
  );
}