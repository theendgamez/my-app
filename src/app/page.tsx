"use client";

import { useEffect, useState } from 'react';
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";

interface User {
  role: string;
  // 可以根据需要添加其他用户属性
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen flex">
      {/* 当用户是管理员时显示 Sidebar */}
      {isAdmin && <Sidebar />}

      {/* 主内容区域 */}
      <div className={`flex-1 flex flex-col ${isAdmin ? 'ml-64' : 'ml-0'}`}>
        <Navbar />
        <main className="p-8">
          <h1 className="text-2xl font-bold mb-4 text-blue-500">即將舉行的演唱會</h1>
          {/* 其他内容，例如演唱會列表 */}
        </main>
      </div>
    </div>
  );
}