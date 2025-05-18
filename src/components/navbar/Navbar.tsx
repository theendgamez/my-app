"use client";

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

import { 
  FiSearch, 
  FiMenu, 
  FiX, 
  FiShoppingCart, 
  FiUser, 
  FiChevronDown,
  FiLogOut,
  FiTag
} from 'react-icons/fi';

const Navbar: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  const { user, isAuthenticated, loading, logout, refreshAuthState } = useAuth();

  // Add effect to refresh auth state on mount with proper dependencies
  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      refreshAuthState();
    }
  }, [refreshAuthState]);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsUserMenuOpen(false);
    }
  }, [isAuthenticated]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?query=${encodeURIComponent(searchQuery.trim())}`);
      setIsNavOpen(false);
    }
  };

  // Enhanced logout handler
  const handleLogout = async () => {
    try {
      await logout();
      setIsNavOpen(false);
      setIsUserMenuOpen(false);
      
      // Use replace instead of push to prevent back button issues
      router.replace('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-white font-bold text-xl">票務系統</span>
            </Link>
          </div>

          <div className="hidden md:flex md:items-center md:space-x-4">
            <Link href="/events" className="text-gray-100 hover:bg-blue-700 px-3 py-2 rounded transition-colors">
              活動
            </Link>
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋活動..."
                className="w-64 bg-blue-700/30 text-white placeholder-gray-300 border border-blue-500 rounded-full py-1 px-4 focus:outline-none focus:ring-2 focus:ring-white"
              />
              <button 
                type="submit" 
                className="absolute right-0 top-0 h-full px-3 text-white"
              >
                <FiSearch />
              </button>
            </form>
          </div>

          <div className="hidden md:flex md:items-center md:space-x-4">
            {isAuthenticated && user ? (
              <div className="relative flex items-center space-x-4">
                <Link href="/user/cart" className="text-white hover:text-gray-200 transition-colors flex items-center">
                  <div className="flex items-center justify-center">
                    <FiShoppingCart className="h-6 w-6" />
                  </div>
                </Link>
                
                <div className="relative" ref={userMenuRef}>
                  <button 
                    className="flex items-center space-x-1 text-gray-100 hover:text-white"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  >
                    <span>{typeof user.userName === 'string' && user.userName.trim() !== '' ? user.userName : '用戶'}</span>
                    <FiChevronDown className={`h-4 w-4 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 ring-1 ring-black ring-opacity-5">
                      <Link 
                        href="/user/profile" 
                        className="flex px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 items-center"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <FiUser className="mr-2" />
                        個人資料
                      </Link>
                      <Link 
                        href="/user/order" 
                        className="flex px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 items-center"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <FiTag className="mr-2" />
                        我的票券
                      </Link>
                      <Link 
                        href="/user/friends" 
                        className="flex px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 items-center"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <FiTag className="mr-2" />
                        好友管理
                      </Link>
                      <Link 
                        href="/user/lottery" 
                        className="flex px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 items-center"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <FiTag className="mr-2" />
                        我的抽籤
                      </Link>
                      <button 
                        onClick={handleLogout}
                        className="flex w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 items-center text-left"
                      >
                        <FiLogOut className="mr-2" />
                        登出
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : loading ? (
              <div className="flex items-center space-x-2">
                <div className="h-3 w-12 bg-blue-400/30 rounded animate-pulse"></div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login" className="text-gray-100 hover:bg-blue-700 rounded px-3 py-2 transition-colors">
                  登入
                </Link>
                <Link href="/signup" className="bg-white text-blue-700 hover:bg-gray-100 font-medium rounded-md px-3 py-2 transition-colors">
                  註冊
                </Link>
              </div>
            )}
          </div>

          <div className="flex md:hidden">
            <button 
              onClick={() => setIsNavOpen(!isNavOpen)}
              className="text-gray-100 hover:text-white focus:outline-none"
            >
              {isNavOpen ? (
                <FiX className="block h-6 w-6" />
              ) : (
                <FiMenu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {isNavOpen && (
        <div className="md:hidden bg-blue-700">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <form onSubmit={handleSearch} className="flex p-2 mb-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋活動..."
                className="w-full bg-blue-800 text-white placeholder-gray-300 border border-blue-600 rounded-l-md py-2 px-3 focus:outline-none"
              />
              <button 
                type="submit" 
                className="bg-blue-600 text-white px-4 py-2 rounded-r-md"
              >
                <FiSearch className="h-5 w-5" />
              </button>
            </form>
            
            <Link 
              href="/events"
              className="block text-gray-100 hover:bg-blue-800 px-3 py-2 rounded"
              onClick={() => setIsNavOpen(false)}
            >
              活動
            </Link>
            
            {isAuthenticated && user ? (
              <>
              <Link 
                  href="/user/cart"
                  className="flex items-center text-gray-100 hover:bg-blue-800 px-4 py-3 rounded"
                  onClick={() => setIsNavOpen(false)}
                >
                  <FiShoppingCart className="mr-2 h-5 w-5" />
                  購物車
              </Link>
                <Link 
                  href="/user/profile"
                  className="flex items-center text-gray-100 hover:bg-blue-800 px-3 py-2 rounded"
                  onClick={() => setIsNavOpen(false)}
                >
                  <FiUser className="mr-2 h-5 w-5" />
                  個人資料
                </Link>
                <Link 
                  href="/user/order"
                  className="flex items-center text-gray-100 hover:bg-blue-800 px-3 py-2 rounded"
                  onClick={() => setIsNavOpen(false)}
                >
                  <FiTag className="mr-2 h-5 w-5" />
                  我的票券
                </Link>
                <Link 
                  href="/user/friends"
                  className="flex items-center text-gray-100 hover:bg-blue-800 px-3 py-2 rounded"
                  onClick={() => setIsNavOpen(false)}
                >
                  <FiTag className="mr-2 h-5 w-5" />
                  好友管理
                </Link>
                <Link 
                  href="/user/lottery"
                  className="flex items-center text-gray-100 hover:bg-blue-800 px-3 py-2 rounded"
                  onClick={() => setIsNavOpen(false)}
                >
                  <FiTag className="mr-2 h-5 w-5" />
                  我的抽籤
                </Link>
                <button 
                  onClick={handleLogout}
                  className="flex items-center w-full text-left text-gray-100 hover:bg-blue-800 px-3 py-2 rounded"
                >
                  <FiLogOut className="mr-2 h-5 w-5" />
                  登出
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/login"
                  className="block text-gray-100 hover:bg-blue-800 px-3 py-2 rounded"
                  onClick={() => setIsNavOpen(false)}
                >
                  登入
                </Link>
                <Link 
                  href="/signup"
                  className="block text-gray-100 hover:bg-blue-800 px-3 py-2 rounded"
                  onClick={() => setIsNavOpen(false)}
                >
                  註冊
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;