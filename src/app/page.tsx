"use client";
import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Users, Events as EventType } from './api/types';
import Sidebar from '@/components/Sidebar';
import PromoCarousel from '@/components/PromoCarousel';
import Events from '@/components/event';
import db from '@/lib/db';

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
    // Fetch user data
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    // Fetch events using db utility
    const fetchEvents = async () => {
      try {
        const data = await db.event.findMany();
        setEvents((data as EventType[]) || []);
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
      <Navbar userName={user?.userName} />
      <div className="flex flex-1">
        {isAdmin && <Sidebar />}
        <main className={`flex-1 p-8 ${isAdmin ? 'ml-64' : ''}`}>
          <PromoCarousel images={promoImages} />
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
            </div>
          ) : (
            <Events events={events} />
          )}
        </main>
      </div>
    </div>
  );
}