"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users } from '../api/types/index';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
}

const NavLink = ({ href, children }: NavLinkProps) => (
  <Link href={href} className="text-gray-300 hover:text-white transition-colors">
    {children}
  </Link>
);

const navItems = [
  { href: '/', label: '首頁' },
  { href: '/concerts', label: '演唱會' },
];

const userNavItems = [
  { href: '/profile', label: '個人資料' },
  { href: '/orders', label: '訂單記錄' },
];

interface NavbarProps {
  userName?: string;
}

const Navbar: React.FC<NavbarProps> = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<Users | null>(null);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?query=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  return (
    <nav className="bg-gray-800 p-4 shadow-lg">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-6">
          {navItems.map(item => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
            </NavLink>
          ))}
        </div>

        <form onSubmit={handleSearch} className="flex-1 max-w-md mx-4">
          <input
            type="search"
            placeholder="搜尋演唱會..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded bg-gray-700 text-white focus:outline-none"
          />
        </form>

        <div className="flex items-center space-x-4">
          {user ? (
            <>
              {userNavItems.map(item => (
                <NavLink key={item.href} href={item.href}>
                  {item.label}
                </NavLink>
              ))}
              <button
                onClick={handleLogout}
                className="text-gray-300 hover:text-white transition-colors"
              >
                登出
              </button>
              <span className="text-white">{user.userName}</span>
            </>
          ) : (
            <>
              <NavLink href="/login">登入</NavLink>
              <NavLink href="/signup">註冊</NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
