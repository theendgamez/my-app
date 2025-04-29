import React, { useEffect, useState } from 'react';
import Navbar from '@/components/navbar/Navbar';
import { Events as EventType } from '@/types';
import Sidebar from '@/components/admin/Sidebar';
import PromoCarousel from '@/components/ui/PromoCarousel';
import Events from '@/components/event/event';

// Utility function for robust data fetching with retries
const fetchWithRetry = async (url: string, options: RequestInit = {}, maxRetries = 2) => {
  let retryCount = 0;
  let lastError: Error | null = null;

  while (retryCount <= maxRetries) {
    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      // Merge the signal with existing options
      const fetchOptions = {
        ...options,
        signal: controller.signal,
      };
      
      console.log(`[Fetch] Requesting ${url} (attempt ${retryCount + 1}/${maxRetries + 1})`);
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (error instanceof TypeError && error.message.includes('NetworkError')) {
        console.error(`[Fetch] Network error (attempt ${retryCount + 1}): ${error.message}`);
      } else if (error instanceof DOMException && error.name === 'AbortError') {
        console.error(`[Fetch] Request timeout (attempt ${retryCount + 1})`);
      } else {
        console.error(`[Fetch] Request failed (attempt ${retryCount + 1}):`, error);
      }
      
      retryCount++;
      
      if (retryCount <= maxRetries) {
        // Exponential backoff
        const delay = 1000 * Math.pow(2, retryCount);
        console.log(`[Fetch] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error(`Failed to fetch after ${maxRetries + 1} attempts`);
};

// This component contains all the client-side logic from the original page.tsx
export default function HomePage() {
  // Moved from page.tsx
  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const promoImages = [
    '/img/0fa38ee3-2eba-4791-add7-e7e51875aa99-8c562be975bedfb29f99876ef156d434042172ff.jpg',
    '/images/promo2.jpg',
    '/images/promo3.jpg',
  ];

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get userId from localStorage
        const userId = localStorage.getItem('userId');
        
        // Fetch user data (if logged in)
        if (userId) {
          try {
            const accessToken = localStorage.getItem('accessToken');
            const userData = await fetchWithRetry(`${window.location.origin}/api/users/${userId}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
                'x-user-id': userId
              },
              cache: 'no-store'
            });

            // 新增：只有 userData 有效且 role === 'admin' 时才设为 admin
            if (userData && typeof userData === 'object' && userData.role) {
              setIsAdmin(userData.role === 'admin');
            } else {
              // 无效数据，清除 localStorage
              localStorage.removeItem('userId');
              localStorage.removeItem('accessToken');
              setIsAdmin(false);
            }
          } catch (error) {
            // API 返回 401/403 或异常时，清除 localStorage
            localStorage.removeItem('userId');
            localStorage.removeItem('accessToken');
            setIsAdmin(false);
            console.error('[User API] Error fetching user data:', error);
          }
        } else {
          setIsAdmin(false);
        }
        
        // Fetch events data (always)
        try {
          const eventsData = await fetchWithRetry(`${window.location.origin}/api/events`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store'
          });
          
          setEvents(eventsData);
        } catch (error) {
          console.error('[Events API] Error fetching events:', error);
          setFetchError(error instanceof Error ? error.message : 'Failed to load events');
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
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
            ) : fetchError ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{fetchError}</span>
                <button 
                  className="mt-3 bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded" 
                  onClick={() => window.location.reload()}
                >
                  Retry
                </button>
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
