'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Events from '@/components/event';
import db from '@/lib/db';
import { Events as EventType } from '@/app/api/types';

export default function EventsPage() {
  const [events, setEvents] = useState<EventType[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await db.event.findMany();
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
      <div className="flex-1 flex items-center justify-center mt-16">
        <div className="container mx-auto" style={{ width: '210mm', height: '297mm' }}>
          <h1 className="text-4xl font-bold text-left mb-4">活動</h1>
          <input
            type="text"
            name="search"
            id="search"
            placeholder="搜尋活動"
            className="form-control"
            style={{ width: '200mm' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {loading ? (
            <div className="grid grid-rows-4 grid-cols-4 h-48">
              <div className="row-start-2 col-start-2 row-span-2 col-span-2 flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
              </div>
            </div>
          ) : (
            <Events events={filteredEvents} />
          )}
        </div>
      </div>
    </div>
  );
}