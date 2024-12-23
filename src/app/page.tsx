"use client";
import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Users } from './api/types';
import Sidebar from '@/components/Sidebar';
import PromoCarousel from '@/components/PromoCarousel';

export default function Home() {
  const [user, setUser] = useState<Users | null>(null);

  const promoImages = [
    '/img/0fa38ee3-2eba-4791-add7-e7e51875aa99-8c562be975bedfb29f99876ef156d434042172ff.jpg',
    '/images/promo2.jpg',
    '/images/promo3.jpg',
  ];

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
          {/* 將圖片輪播抽離到 PromoCarousel 組件 */}
          <PromoCarousel images={promoImages} />
        </main>
      </div>
    </div>
  );
}