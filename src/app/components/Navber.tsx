// components/Navbar.tsx
"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '../types/User';


export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    // 從 localStorage 獲取使用者資訊
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?query=${searchQuery}`);
  };

  const handleLogout = () => {
    // 清除 localStorage 中的使用者資訊
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  return (
    <nav className="bg-gray-800 p-4 text-white">
      <div className="container mx-auto flex items-center justify-between">
        {/* 左側：網站名稱和搜尋框 */}
        <div className="flex items-center space-x-4">
          <Link href="/" className="text-xl font-bold text-white">
            售票平台
          </Link>
          <form onSubmit={handleSearch} className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="搜尋演唱會"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="p-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none"
            />
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded text-white"
            >
              搜尋
            </button>
          </form>
        </div>
        {/* 右側：根據登入狀態顯示內容 */}
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <span>歡迎，{user.userName}</span>
              <button onClick={handleLogout} className="hover:underline">
                登出
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:underline">
                登入
              </Link>
              <Link href="/signup" className="hover:underline">
                註冊
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}