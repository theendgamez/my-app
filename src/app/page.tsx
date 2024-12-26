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
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col" style={{ width: '210mm', height: '297mm' }}>
        <Navbar userName={user?.userName} />
        {isAdmin && (
          <div className="absolute left-0 top-0 h-full">
            <Sidebar />
          </div>
        )}
        <div className="flex flex-1 w-full">
          <main className="flex-1 p-8">
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
          </main>
        </div>
      </div>
    </div>
  );
}