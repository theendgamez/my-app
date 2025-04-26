import React, { useEffect, useState } from 'react';
import Navbar from '@/components/navbar/Navbar';
import { Events as EventType } from '@/types';
import Sidebar from '@/components/ui/Sidebar';
import PromoCarousel from '@/components/ui/PromoCarousel';
import Events from '@/components/event/event';

// This component contains all the client-side logic from the original page.tsx
export default function HomePage() {
  // Moved from page.tsx
  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const promoImages = [
    '/img/0fa38ee3-2eba-4791-add7-e7e51875aa99-8c562be975bedfb29f99876ef156d434042172ff.jpg',
    '/images/promo2.jpg',
    '/images/promo3.jpg',
  ];

  useEffect(() => {
    // Get userId from localStorage
    const userId = localStorage.getItem('userId');
    
    if (userId) {
      // Fetch user data from API
      const fetchUserData = async () => {
        try {
          const accessToken = localStorage.getItem('accessToken');
          const response = await fetch(`/api/users/${userId}`, {
            headers: {
              'Content-Type': 'application/json',
              ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
              'x-user-id': userId
            },
            credentials: 'omit'
          });
          
          if (response.ok) {
            const userData = await response.json();
            setIsAdmin(userData.role === 'admin');
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      };
      
      fetchUserData();
    }
    
    // Fetch events data
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
        if (response.ok) {
          const data = await response.json();
          setEvents(data);
        } else {
          console.error('Failed to fetch events');
        }
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
  }, []);

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4 pt-20">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Only show Sidebar for admins */}
          {isAdmin && <Sidebar isAdmin={isAdmin} />}
          
          {/* Adjust the div to take full width when Sidebar is not shown */}
          <div className={`flex-1 ${isAdmin ? 'md:ml-64' : 'w-full'}`}>
            <div className="mb-8">
              <PromoCarousel images={promoImages} />
            </div>
            <h2 className="text-2xl font-bold mb-4">最新活動</h2>
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <Events events={events} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
