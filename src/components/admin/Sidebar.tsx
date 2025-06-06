"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { 
  FiHome, 
  FiPlus, 
  FiList, 
  FiUsers, 
  FiTag, 
  FiShoppingBag, 
  FiDollarSign, 
  FiBarChart2, 
  FiSettings, 
  FiChevronDown, 
  FiChevronUp,
  FiCamera,
  FiLink
} from 'react-icons/fi';
import { RiBattery2Line } from 'react-icons/ri';

interface MenuSection {
  title: string;
  isOpen: boolean;
  items: Array<{
    name: string;
    href: string;
    icon: React.ReactNode;
  }>;
}

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  isMobile: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar, isMobile }) => {
  const { isAdmin, isAuthenticated, loading: authLoading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [localAdmin, setLocalAdmin] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  
  // Calculate effectiveIsAdmin with useMemo so it can be safely used in dependencies
  const effectiveIsAdmin = useMemo(() => isAdmin || localAdmin, [isAdmin, localAdmin]);
  
  const [sections, setSections] = useState<MenuSection[]>([
    {
      title: '儀表板',
      isOpen: true,
      items: [
        { name: '總覽', icon: <FiHome size={18} />, href: '/admin/dashboard' },
      ]
    },
    {
      title: '活動管理',
      isOpen: false,
      items: [
        { name: '建立活動', icon: <FiPlus size={18} />, href: '/admin/create-event' },
        { name: '活動列表', icon: <FiList size={18} />, href: '/admin/events' },
      ]
    },
    {
      title: '抽籤系統',
      isOpen: false,
      items: [
        { name: '抽籤管理', icon: <RiBattery2Line size={18} />, href: '/admin/lottery' },
        { name: '執行抽籤', icon: <RiBattery2Line size={18} />, href: '/admin/lottery/draw' },
      ]
    },
    {
      title: '用戶與票券',
      isOpen: false,
      items: [
        { name: '用戶管理', icon: <FiUsers size={18} />, href: '/admin/users' },
        { name: '票券管理', icon: <FiTag size={18} />, href: '/admin/tickets' },
        { name: '訂單管理', icon: <FiShoppingBag size={18} />, href: '/admin/orders' },
        {
          name: '掃描票券',
          href: '/admin/tickets/scan',
          icon: <FiCamera size={18} />,
        },
      ]
    },
    {
      title: '財務',
      isOpen: false,
      items: [
        { name: '支付記錄', icon: <FiDollarSign size={18} />, href: '/admin/payments' },
        { name: '財務報告', icon: <FiBarChart2 size={18} />, href: '/admin/reports' },
      ]
    },
    {
      title: '系統設定',
      isOpen: false,
      items: [
        { name: '系統設定', icon: <FiSettings size={18} />, href: '/admin/settings' },
      ]
    },
    {
      title: '區塊鏈管理',
      isOpen: false,
      items: [
        {
          name: '區塊鏈',
          href: '/admin/blockchain',
          icon: <FiLink size={18} />,
        },
      ]
    },
  ]);

  // Use localStorage to check if admin on client-side
  useEffect(() => {
    setIsMounted(true);
    const role = localStorage.getItem('userRole');
    setLocalAdmin(role === 'admin');
  }, []);

  // Redirect if not admin
  useEffect(() => {
    if (isMounted && !authLoading && !effectiveIsAdmin && !hasRedirected) {
      router.push('/');
      setHasRedirected(true);
    }
  }, [isMounted, authLoading, effectiveIsAdmin, router, hasRedirected]);

  // Toggle section
  const toggleSection = (index: number) => {
    setSections(prev => 
      prev.map((section, i) => 
        i === index ? { ...section, isOpen: !section.isOpen } : section
      )
    );
  };

  // Responsive classes for sidebar

  if (authLoading || !isAuthenticated) {
    return null;
  }
  
  // Mobile sidebar should be a overlay when open
  const mobileStyles = isMobile 
    ? isOpen 
      ? 'fixed inset-0 z-40 bg-white w-64 shadow-lg transition-transform duration-300 transform translate-x-0' 
      : 'fixed inset-0 z-40 bg-white w-64 shadow-lg transition-transform duration-300 transform -translate-x-full'
    : isOpen
      ? 'fixed top-0 left-0 z-30 w-64 h-screen pt-16 bg-white shadow-md transition-transform duration-300 transform translate-x-0'
      : 'fixed top-0 left-0 z-30 w-64 h-screen pt-16 bg-white shadow-md transition-transform duration-300 transform -translate-x-full md:translate-x-0';

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={toggleSidebar}
        ></div>
      )}
      
      {/* Sidebar */}
      <aside className={mobileStyles}>
        {isMobile && (
          <div className="p-4 border-b">
            <button 
              onClick={toggleSidebar}
              className="text-gray-700 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        <nav className="mt-4">
          <ul className="space-y-1 px-2">
            {sections.map((section, index) => (
              <li key={section.title}>
                {isOpen ? (
                  <button
                    className="flex items-center justify-between w-full px-2 py-2 text-gray-700 hover:text-gray-900 focus:outline-none"
                    onClick={() => toggleSection(index)}
                  >
                    <span className="text-sm font-medium">{section.title}</span>
                    {section.isOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                  </button>
                ) : (
                  <div className="px-2 py-2 text-gray-600 text-center text-xs">
                    {section.title.charAt(0)}
                  </div>
                )}
                
                <div className={`mt-2 space-y-1 ${!isOpen ? 'pl-0' : 'pl-2'}`}>
                  {(isOpen ? section.isOpen : true) && (
                    section.items.map((item) => {
                      const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                      
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center ${isOpen ? 'px-4 py-2 text-sm' : 'px-2 py-3 justify-center'} rounded-md transition-colors ${
                            isActive 
                              ? 'bg-blue-50 text-blue-700 font-medium' 
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                          title={!isOpen ? item.name : undefined}
                          onClick={() => isMobile && toggleSidebar()}
                        >
                          <span className={`${isActive ? 'text-blue-600' : 'text-gray-500'} ${isOpen ? 'mr-3' : ''}`}>
                            {item.icon}
                          </span>
                          {isOpen && <span>{item.name}</span>}
                        </Link>
                      );
                    })
                  )}
                </div>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;