"use client";

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UserMenu from './UserMenu';
import { FiMenu, FiX, FiSearch } from 'react-icons/fi';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  // Close mobile menu when screen size changes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/events?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      closeMobileMenu();
    }
  };

  return (
    <>
      <nav className="navbar-fixed">
        <div className="navbar-content">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold text-white">票務系統</span>
          </Link>

          {/* Desktop Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-6">
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜索活動..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <FiSearch className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </form>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/events" className="nav-link text-white hover:text-blue-200">
              活動
            </Link>
            
            {isAuthenticated ? (
              <>
                <Link href="/user/cart" className="nav-link text-white hover:text-blue-200">
                  購物車
                </Link>
                <Link href="/user/order" className="nav-link text-white hover:text-blue-200">
                  我的訂單
                </Link>
                {user && <UserMenu user={{
                  ...user,
                  password: '',
                  isEmailVerified: false,
                  isPhoneVerified: false,
                  createdAt: new Date().toISOString()
                } as Parameters<typeof UserMenu>[0]['user']} onLogout={logout} />}
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/login" className="nav-link text-white hover:text-blue-200">
                  登入
                </Link>
                <Link href="/signup" className="nav-link text-white hover:text-blue-200">
                  註冊
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden p-2 text-white hover:text-blue-200 focus:outline-none"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-blue-600 border-t border-blue-500">
            <div className="px-4 py-2 space-y-2">
              {/* Mobile Search Bar */}
              <div className="py-2">
                <form onSubmit={handleSearch}>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="搜索活動..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-2 pl-10 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                      <FiSearch className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </form>
              </div>

              <Link 
                href="/events" 
                className="block py-2 text-white hover:text-blue-200"
                onClick={closeMobileMenu}
              >
                活動
              </Link>
              
              {isAuthenticated ? (
                <>
                  <Link 
                    href="/user/cart" 
                    className="block py-2 text-white hover:text-blue-200"
                    onClick={closeMobileMenu}
                  >
                    購物車
                  </Link>
                  <Link 
                    href="/user/order" 
                    className="block py-2 text-white hover:text-blue-200"
                    onClick={closeMobileMenu}
                  >
                    我的訂單
                  </Link>
                  <div className="pt-2 border-t border-blue-500">
                    <span className="block py-2 text-white">歡迎，{user?.userName || user?.realName || '用戶'}</span>
                    <button 
                      onClick={() => {
                        logout();
                        closeMobileMenu();
                      }}
                      className="block py-2 text-white hover:text-blue-200 w-full text-left"
                    >
                      登出
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link 
                    href="/login" 
                    className="block py-2 text-white hover:text-blue-200"
                    onClick={closeMobileMenu}
                  >
                    登入
                  </Link>
                  <Link 
                    href="/register" 
                    className="block py-2 text-white hover:text-blue-200"
                    onClick={closeMobileMenu}
                  >
                    註冊
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
      
      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={closeMobileMenu}
        />
      )}
    </>
  );
};

export default Navbar;