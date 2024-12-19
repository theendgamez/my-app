"use client";
import { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import { Users } from './api/types';
import Sidebar from './components/Sidebar';

export default function Home() {
  const [user, setUser] = useState<Users| null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar userName={user?.userName} />
      
      <div className="flex flex-1">
        {isAdmin && <Sidebar />}
        
        <main className={`flex-1 p-8 ${isAdmin ? 'ml-64' : ''}`}>
          <h1 className="text-2xl font-bold mb-4 text-blue-500">即將舉行的演唱會</h1>
          {/* 其他內容，例如演唱會列表 */}
        </main>
      </div>
    </div>
  );
}