"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from '@/types';
import SearchBar from './SearchBar';
import UserMenu from './UserMenu';

const NavbarLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="block w-full px-4 py-2 text-white hover:bg-gray-700 transition duration-200">
    {children}
  </Link>
);

const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<Users | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
      setIsMobileMenuOpen(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-gray-800 shadow-lg fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4">
        {/* Main navbar content */}
        <div className="h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-xl font-bold text-white">
              售票平台
            </Link>
            <div className="hidden md:block">
              <SearchBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSubmit={handleSearch}
              />
            </div>
            <div className="hidden md:flex space-x-6">
            <NavbarLink href="/events">活動</NavbarLink>
            </div>
          </div>

          <div className="flex items-center">
            <div className="hidden lg:flex items-center space-x-6">
            {user && (
              <Link href={`/user/${user.userId}/cart`} className=" text-white">
                購物車
              </Link>
            )}
              {user ? (
                <UserMenu user={user} onLogout={handleLogout} />
              ) : (
                <>
                  <NavbarLink href="/login">登入</NavbarLink>
                  <NavbarLink href="/signup">註冊</NavbarLink>
                </>
              )}
            </div>

            <button
              className="lg:hidden ml-4 p-2 text-white hover:bg-gray-700 rounded-lg"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMobileMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-gray-800 border-t border-gray-700">
            <div className="px-4 py-3">
              <SearchBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSubmit={handleSearch}
              />
            </div>
            <div className="border-t border-gray-700">
              <NavbarLink href="/events">活動</NavbarLink>
              {user ? (
                <div className="px-4 py-2">
                  <UserMenu user={user} onLogout={handleLogout} />
                </div>
              ) : (
                <>
                  <NavbarLink href="/login">登入</NavbarLink>
                  <NavbarLink href="/signup">註冊</NavbarLink>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;