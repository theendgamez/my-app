'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/navbar/Navbar';
import Events from '@/components/eventCompo/EventCard';
import db from '@/lib/db';
import { Events as EventType } from '@/types';

export default function EventsPage() {
  const [events, setEvents] = useState<EventType[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await db.events.findMany();
        setEvents(data as EventType[]);
        setFilteredEvents(data as EventType[]);
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

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
          ) : (
            <Events events={filteredEvents} />
          )}
        </div>
      </main>
    </div>
  );
}