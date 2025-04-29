"use client";

import { useEffect, useState } from 'react';
import AdminSidebar from '@/components/admin/Sidebar';
import { 
  FaUsers, 
  FaCalendarAlt, 
  FaTicketAlt, 
  FaShoppingCart,
  FaSync,
  FaLock
} from 'react-icons/fa';
import { useRouter } from 'next/navigation';

interface Stats {
  users: { total: number };
  events: { total: number };
  bookings: { total: number };
  tickets: { total: number };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    users: { total: 0 },
    events: { total: 0 },
    bookings: { total: 0 },
    tickets: { total: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`Fetching stats at ${new Date().toISOString()}`);
        
        const userId = localStorage.getItem('userId');
        const accessToken = localStorage.getItem('accessToken');
        
        if (!userId || !accessToken) {
          console.warn('No authentication found, user might not be logged in');
        }
        
        const response = await fetch('/api/admin/stats', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            ...(userId ? { 'x-user-id': userId } : {}),
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
          }
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          if (response.status === 403) {
            console.error('Access forbidden: User may not have admin privileges');
            throw new Error('無管理員權限，請使用管理員帳號登入');
          }
          
          try {
            const errorData = await response.json();
            throw new Error(`Failed to fetch stats: ${errorData.error || response.statusText}`);
          } catch {
            throw new Error(`Failed to fetch stats: ${response.status} ${response.statusText}`);
          }
        }
        
        const data = await response.json();
        console.log('Stats data received:', data);
        setStats(data);
      } catch (err) {
        console.error('Error fetching admin stats:', err);
        const errorMessage = err instanceof Error ? err.message : '無法載入管理統計數據';
        setError(errorMessage);
        
        if (errorMessage.includes('無管理員權限')) {
          localStorage.removeItem('userId');
          localStorage.removeItem('accessToken');
          
          setTimeout(() => {
            if (confirm('需要管理員權限。是否前往登入頁面？')) {
              router.push('/login?redirect=/admin');
            }
          }, 2000);
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Using fallback stats data');
          setStats({
            users: { total: 42 },
            events: { total: 15 },
            bookings: { total: 184 },
            tickets: { total: 350 }
          });
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [router]);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setTimeout(() => {
      const fetchStats = async () => {
        try {
          setLoading(true);
          setError(null);
          
          console.log(`Retrying fetch stats at ${new Date().toISOString()}`);
          
          const response = await fetch('/api/admin/stats', {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache'
            }
          });
          
          console.log('Retry response status:', response.status);
          
          if (!response.ok) {
            try {
              const errorData = await response.json();
              throw new Error(`Failed to fetch stats: ${errorData.error || response.statusText}`);
            } catch {
              throw new Error(`Failed to fetch stats: ${response.status} ${response.statusText}`);
            }
          }
          
          const data = await response.json();
          console.log('Retry stats data received:', data);
          setStats(data);
        } catch (err) {
          console.error('Error retrying fetch admin stats:', err);
          setError(err instanceof Error ? err.message : '無法載入管理統計數據');
        } finally {
          setLoading(false);
        }
      };
      fetchStats();
    }, 500);
  };

  return (
    <div className="flex">
      <AdminSidebar />
      <div className="flex-1 p-8 ml-64">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">管理員儀表板</h1>
          {error && (
            <button 
              onClick={handleRetry} 
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              <FaSync className="mr-2" /> 重試
            </button>
          )}
        </div>
        
        {error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <div className="flex items-center mb-2">
              {error.includes('無管理員權限') && <FaLock className="mr-2" />}
              <p className="font-bold">{error.includes('無管理員權限') ? '權限錯誤' : '錯誤'}</p>
            </div>
            <p>{error}</p>
            {error.includes('無管理員權限') && (
              <button 
                onClick={() => router.push('/login?redirect=/admin')} 
                className="mt-3 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                前往登入
              </button>
            )}
            {process.env.NODE_ENV === 'development' && (
              <p className="mt-2 text-sm">
                請檢查: <br />
                1. API 端點是否存在並正確實現 <br />
                2. 必要的數據庫方法是否已實現 <br />
                3. 用戶是否有正確的管理員權限
              </p>
            )}
          </div>
        ) : loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <FaUsers className="text-blue-500 text-xl" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">用戶數</p>
                <p className="text-2xl font-bold">{stats.users.total}</p>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
              <div className="bg-green-100 p-3 rounded-full mr-4">
                <FaCalendarAlt className="text-green-500 text-xl" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">活動數</p>
                <p className="text-2xl font-bold">{stats.events.total}</p>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
              <div className="bg-purple-100 p-3 rounded-full mr-4">
                <FaShoppingCart className="text-purple-500 text-xl" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">訂單數</p>
                <p className="text-2xl font-bold">{stats.bookings.total}</p>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
              <div className="bg-yellow-100 p-3 rounded-full mr-4">
                <FaTicketAlt className="text-yellow-500 text-xl" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">票券數</p>
                <p className="text-2xl font-bold">{stats.tickets.total}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
