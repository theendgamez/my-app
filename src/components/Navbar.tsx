"use client";

import Link from 'next/link';
import { useState, useEffect, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from '@/app/api/types';
import { Menu, Transition } from '@headlessui/react';
import { FiChevronDown, FiSearch } from 'react-icons/fi';

const NavbarLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="hover:underline text-white transition duration-200">
    {children}
  </Link>
);

const SearchBar = ({ searchQuery, setSearchQuery, onSubmit }: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) => (
  <form onSubmit={onSubmit} className="flex items-center space-x-2">
    <div className="relative">
      <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        placeholder="搜尋演唱會"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-10 p-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 w-64"
      />
    </div>
    <button
      type="submit"
      className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg text-white transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      搜尋
    </button>
  </form>
);

const UserMenu = ({ user, onLogout }: { user: Users; onLogout: () => void }) => (
  <Menu as="div" className="relative">
    <Menu.Button className="flex items-center space-x-2 transition duration-200 text-white">
      <span>歡迎，{user.userName}</span>
      <FiChevronDown className="h-5 w-5" />
    </Menu.Button>
    <Transition
      as={Fragment}
      enter="transition ease-out duration-100"
      enterFrom="transform opacity-0 scale-95"
      enterTo="transform opacity-100 scale-100"
      leave="transition ease-in duration-75"
      leaveFrom="transform opacity-100 scale-100"
      leaveTo="transform opacity-0 scale-95"
    >
      <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none divide-y divide-gray-100">
        <div className="py-1">
          <Menu.Item>
            {({ active }) => (
              <Link
                href="/profile"
                className={`${
                  active ? 'bg-gray-100' : ''
                } block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition duration-200`}
              >
                個人資料
              </Link>
            )}
          </Menu.Item>
          <Menu.Item>
            {({ active }) => (
              <button
                onClick={onLogout}
                className={`${
                  active ? 'bg-gray-100' : ''
                } block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition duration-200`}
              >
                登出
              </button>
            )}
          </Menu.Item>
        </div>
      </Menu.Items>
    </Transition>
  </Menu>
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