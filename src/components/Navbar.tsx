"use client";

import Link from 'next/link';
import { useState, useEffect} from 'react';
import { useRouter } from 'next/navigation';
import { Users } from '@/app/api/types';
import SearchBar from './SearchBar';
import UserMenu from './UserMenu';

const NavbarLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="hover:underline text-white transition duration-200">
    {children}
  </Link>
);

interface NavbarProps {
  userName?: string;
}

const Navbar: React.FC<NavbarProps> = ({}) => {
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
    <nav className="bg-gray-800 p-4 shadow-lg fixed top-0 left-0 right-0 z-50 h-16">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <NavbarLink href="/">
            <span className="text-xl font-bold">售票平台</span>
          </NavbarLink>
          <SearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSubmit={handleSearch}
          />
          <NavbarLink href="/events">活動</NavbarLink>
        </div>
        <div className="flex items-center space-x-6">
          {user ? (
            <UserMenu user={user} onLogout={handleLogout} />
          ) : (
            <>
              <NavbarLink href="/login">登入</NavbarLink>
              <NavbarLink href="/signup">註冊</NavbarLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;