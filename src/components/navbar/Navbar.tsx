"use client";

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UserMenu from './UserMenu';
import { FiMenu, FiX, FiSearch, FiGlobe } from 'react-icons/fi';
import { useTranslations } from '@/hooks/useTranslations';
import { useLanguage } from '@/context/LanguageContext';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const router = useRouter();
  const { t } = useTranslations();
  const { locale, setLocale } = useLanguage();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  const handleLanguageChange = (newLocale: 'en' | 'zh') => {
    setLocale(newLocale);
    setShowLanguageMenu(false);
    // Also close mobile menu if open
    if (isMobileMenuOpen) {
      closeMobileMenu();
    }
  };

  return (
    <>
      <nav className="navbar-fixed">
        <div className="navbar-content">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-lg font-bold text-white">{t('ticketingSystem')}</span>
          </Link>

          {/* Desktop Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-6">
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative">
                <input
                  type="text"
                  placeholder={t('searchEvents')}
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
              {t('events')}
            </Link>
            
            {isAuthenticated ? (
              <>
                <Link href="/user/cart" className="nav-link text-white hover:text-blue-200">
                  {t('cart')}
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
                  {t('login')}
                </Link>
                <Link href="/signup" className="nav-link text-white hover:text-blue-200">
                  {t('signup')}
                </Link>
              </div>
            )}

            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="flex items-center space-x-1 text-white hover:text-blue-200 transition duration-200 text-xs"
              >
                <FiGlobe size={18} />
                <span>
                  {isMounted ? (locale === 'zh' ? t('chinese') : t('english')) : t('english')}
                </span>
              </button>
              
              {showLanguageMenu && (
                <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <button
                    onClick={() => handleLanguageChange('en')}
                    className={`block w-full text-left px-4 py-2 text-xs hover:bg-gray-100 ${
                      locale === 'en' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    {t('navbarEnglish')}
                  </button>
                  <button
                    onClick={() => handleLanguageChange('zh')}
                    className={`block w-full text-left px-4 py-2 text-xs hover:bg-gray-100 ${
                      locale === 'zh' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    {t('navbarChinese')}
                  </button>
                </div>
              )}
            </div>
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
                      placeholder={t('searchEvents')}
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
                {t('events')}
              </Link>
              
              {isAuthenticated ? (
                <>
                  <Link 
                    href="/user/cart" 
                    className="block py-2 text-white hover:text-blue-200"
                    onClick={closeMobileMenu}
                  >
                    {t('cart')}
                  </Link>
                  <Link 
                    href="/user/order" 
                    className="block py-2 text-white hover:text-blue-200"
                    onClick={closeMobileMenu}
                  >
                    {t('myOrders')}
                  </Link>
                  <div className="pt-2 border-t border-blue-500">
                    <span className="block py-2 text-white">{t('welcomeUser', { userName: user?.userName || user?.realName || t('user') })}</span>
                    <button 
                      onClick={() => {
                        logout();
                        closeMobileMenu();
                      }}
                      className="block py-2 text-white hover:text-blue-200 w-full text-left"
                    >
                      {t('logout')}
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
                    {t('login')}
                  </Link>
                  <Link 
                    href="/register" 
                    className="block py-2 text-white hover:text-blue-200"
                    onClick={closeMobileMenu}
                  >
                    {t('register')}
                  </Link>
                </>
              )}

              {/* Mobile Language Switcher */}
              <div className="pt-2 border-t border-blue-500">
                <div className="py-2 text-white text-xs font-medium">{t('navbarLanguage')}</div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      handleLanguageChange('zh');
                    }}
                    className={`px-3 py-1 rounded text-xs ${
                      locale === 'zh' ? 'bg-white text-blue-600' : 'bg-blue-500 text-white hover:bg-blue-400'
                    }`}
                  >
                    {t('navbarChinese')}
                  </button>
                  <button
                    onClick={() => {
                      handleLanguageChange('en');
                    }}
                    className={`px-3 py-1 rounded text-xs ${
                      locale === 'en' ? 'bg-white text-blue-600' : 'bg-blue-500 text-white hover:bg-blue-400'
                    }`}
                  >
                    {t('navbarEnglish')}
                  </button>
                </div>
              </div>
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

      {/* Language menu overlay for desktop */}
      {showLanguageMenu && (
        <div 
          className="fixed inset-0 z-30"
          onClick={() => setShowLanguageMenu(false)}
        />
      )}
    </>
  );
};

export default Navbar;