"use client";
import React, { useEffect, useState } from 'react';
import Navbar from '@/components/navbar/Navbar';
import { Users, Events as EventType } from '@/types';
import Sidebar from '@/components/ui/Sidebar';
import PromoCarousel from '@/components/ui/PromoCarousel';
import Events from '@/components/event/Event';

export default function Home() {
  const [user, setUser] = useState<Users | null>(null);
  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);

  const promoImages = [
    '/img/0fa38ee3-2eba-4791-add7-e7e51875aa99-8c562be975bedfb29f99876ef156d434042172ff.jpg',
    '/images/promo2.jpg',
    '/images/promo3.jpg',
  ];

  useEffect(() => {
    // Load user from local storage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    // Fetch events
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
        if (response.ok) {
          const data = await response.json();
          setEvents(data || []);
        }
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        {isAdmin && (
          <div className="w-64 min-h-[calc(100vh-64px)] fixed left-0 top-16">
            <Sidebar />
          </div>
        )}
        <main className={`flex-1 ${isAdmin ? 'ml-64' : ''}`}>
          <div className="p-8">
            <PromoCarousel images={promoImages} />
            <h2 className="text-2xl font-bold my-4">最新活動</h2>
            {loading ? (
              <div className="grid grid-rows-4 grid-cols-4 h-48">
                <div className="row-start-2 col-start-2 row-span-2 col-span-2 flex justify-center items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
                </div>
              </div>
            ) : (
              <Events events={events} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}