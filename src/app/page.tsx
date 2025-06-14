"use client";
import React, { useEffect, useState } from 'react';
import Navbar from '@/components/navbar/Navbar';
import { Events as EventType } from '@/types';
import Sidebar from '@/components/admin/Sidebar';
import PromoCarousel from '@/components/ui/PromoCarousel';
import Events from '@/components/eventCompo/EventComponents';

export default function Home() {
  // Removed unused 'user' state
  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const promoImages = [
    '/img/749028-hins_cheung_2026.jpg',
    '/img/LESSERAFIMUnforgiven.webp',
    '/img/442924-gian-super-recital.webp',
  ];

  useEffect(() => {
    // Check for admin status in multiple ways
    const checkAdminStatus = async () => {
      // First, check localStorage directly for userRole
      const userRole = localStorage.getItem('userRole');
      if (userRole === 'admin') {
        setIsAdmin(true);
        return;
      }

      // If no role in localStorage, try to get it from API
      const userId = localStorage.getItem('userId');
      if (userId) {
        try {
          const accessToken = localStorage.getItem('accessToken');
          const response = await fetch(`/api/users/${userId}`, {
            headers: {
              'Content-Type': 'application/json',
              ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
              'x-user-id': userId
            },
            credentials: 'include' // Changed to include for consistent behavior
          });
          
          if (response.ok) {
            try {
              const text = await response.text();
              if (text) {
                const userData = JSON.parse(text);
                // Update localStorage with role if we get it from API
                if (userData.role) {
                  localStorage.setItem('userRole', userData.role);
                }
                setIsAdmin(userData.role === 'admin');
              }
            } catch (parseError) {
              console.error('Failed to parse user data:', parseError);
            }
          }
        } catch (error) {
          console.error('Failed to fetch user data:', error);
        }
      }
    };
    
    checkAdminStatus();

    // Fetch events
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/events');
        
        if (response.ok) {
          const data = await response.json();
          
          // Handle both array response and object response
          if (Array.isArray(data)) {
            setEvents(data);
          } else if (data.events && Array.isArray(data.events)) {
            setEvents(data.events);
          } else {
            console.error('Invalid events data format:', data);
            setEvents([]);
          }
        } else {
          console.error('Failed to fetch events:', response.status);
          setEvents([]);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        {isAdmin && (
          <div className="w-64 min-h-[calc(100vh-64px)] fixed left-0 top-16">
            <Sidebar isOpen={true} toggleSidebar={() => {}} isMobile={false} />
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