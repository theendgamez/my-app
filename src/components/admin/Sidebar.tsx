"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  FiX 
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
          icon: <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>,
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

  const sidebarClasses = `
    ${isMobile ? 'fixed left-0 top-0 z-30' : 'sticky top-0'} 
    transition-all duration-300 transform h-screen bg-[#1a1f36] text-white overflow-y-auto
    ${isMobile ? (isOpen ? 'translate-x-0' : '-translate-x-full') : 'w-64'}
  `;

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className={sidebarClasses}>
      {/* Sidebar header with close button on mobile */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#151a30]">
        <h2 className="text-xl font-bold text-white">票務系統</h2>
        {isMobile && (
          <button 
            onClick={toggleSidebar} 
            className="text-white focus:outline-none p-2"
            aria-label="Close sidebar"
          >
            <FiX size={24} />
          </button>
        )}
      </div>
      
      {/* Admin info */}
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="flex items-center mb-3">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
            <span className="text-white text-lg font-semibold">A</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-white">系統管理員</p>
            <p className="text-xs text-gray-400">管理面板</p>
          </div>
        </div>
      </div>
      
      {/* Navigation menu */}
      <nav className="p-4">
        {sections.map((section, index) => (
          <div key={section.title} className="mb-4">
            <button
              className="flex items-center justify-between w-full px-2 py-2 text-gray-300 hover:text-white focus:outline-none"
              onClick={() => toggleSection(index)}
            >
              <span className="text-sm font-medium">{section.title}</span>
              {section.isOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
            </button>
            
            {section.isOpen && (
              <div className="mt-2 space-y-1 pl-2">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center px-4 py-2 text-sm text-gray-300 rounded-md hover:bg-[#24294e] hover:text-white transition-colors"
                    onClick={() => isMobile && toggleSidebar()}
                  >
                    <span className="mr-3 text-gray-400">{item.icon}</span>
                    {item.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;