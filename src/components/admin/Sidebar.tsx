"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  FiHome, 
  FiPlus, 
  FiList, 
  FiTag, 
  FiUsers, 
  FiShoppingBag, 
  FiBarChart2, 
  FiSettings,
  FiDollarSign,
  FiChevronDown,
  FiChevronRight,
  FiUser
} from 'react-icons/fi';
import { RiBattery2Line } from 'react-icons/ri';

type MenuSection = {
  title: string;
  items: MenuItem[];
  isOpen?: boolean;
};

type MenuItem = {
  name: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
};

const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, isAuthenticated, loading: authLoading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [localAdmin, setLocalAdmin] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  
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
      isOpen: true,
      items: [
        { name: '建立活動', icon: <FiPlus size={18} />, href: '/admin/create-event' },
        { name: '活動列表', icon: <FiList size={18} />, href: '/admin/events' },
      ]
    },
    {
      title: '抽籤系統',
      isOpen: true,
      items: [
        { name: '抽籤管理', icon: <RiBattery2Line size={18} />, href: '/admin/lottery' },
        { name: '執行抽籤', icon: <RiBattery2Line size={18} />, href: '/admin/lottery/draw' },
      ]
    },
    {
      title: '用戶與票券',
      isOpen: true,
      items: [
        { name: '用戶管理', icon: <FiUsers size={18} />, href: '/admin/users' },
        { name: '票券管理', icon: <FiTag size={18} />, href: '/admin/tickets' },
        { name: '訂單管理', icon: <FiShoppingBag size={18} />, href: '/admin/orders' },
      ]
    },
    {
      title: '財務',
      isOpen: true,
      items: [
        { name: '支付記錄', icon: <FiDollarSign size={18} />, href: '/admin/payments' },
        { name: '財務報告', icon: <FiBarChart2 size={18} />, href: '/admin/reports' },
      ]
    },
    {
      title: '系統設定',
      isOpen: true,
      items: [
        { name: '系統設定', icon: <FiSettings size={18} />, href: '/admin/settings' },
      ]
    },
  ]);

  // Track component mounting and check localStorage for admin status
  useEffect(() => {
    setIsMounted(true);
    
    // Also check localStorage for admin status as fallback for Vercel
    if (typeof window !== 'undefined') {
      const userRole = localStorage.getItem('userRole');
      // Only set localAdmin if user is authenticated
      if (isAuthenticated) {
        setLocalAdmin(userRole === 'admin');
      } else {
        setLocalAdmin(false);
      }
    }
  }, [isAdmin, isAuthenticated]);

  // Handle redirection in useEffect, not during render
  useEffect(() => {
    // Skip if not mounted yet or already redirected
    if (!isMounted || hasRedirected) return;
    
    // If not authenticated or not admin, redirect
    if (!authLoading && (!isAuthenticated || (!effectiveIsAdmin && isAuthenticated))) {
      setHasRedirected(true);
      router.replace('/');
    }
  }, [isMounted, authLoading, isAuthenticated, effectiveIsAdmin, router, hasRedirected]);

  // Toggle section collapse state
  const toggleSection = (index: number) => {
    setSections(prevSections => 
      prevSections.map((section, i) => 
        i === index ? { ...section, isOpen: !section.isOpen } : section
      )
    );
  };
  
  // Don't render on server or if not mounted yet
  if (!isMounted) {
    return null; // Avoids hydration issues
  }
  
  // If not admin or not authenticated, don't render the sidebar
  if (!isAuthenticated || (!effectiveIsAdmin && !authLoading)) {
    return null;
  }

  return (
    <div className="w-64 h-[calc(100vh-4rem)] fixed left-0 top-16 bg-gray-900 text-white flex flex-col z-10 overflow-hidden">
      {/* Show loading state if authentication is still loading */}
      {authLoading && !localAdmin && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center z-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      <div className="flex-1 py-4 overflow-y-auto">
        {sections.map((section, sectionIndex) => (
          <div key={section.title} className="mb-4">
            <button
              onClick={() => toggleSection(sectionIndex)}
              className="flex items-center justify-between w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-800"
            >
              <span className="font-medium text-sm uppercase tracking-wider">{section.title}</span>
              {section.isOpen ? (
                <FiChevronDown size={16} />
              ) : (
                <FiChevronRight size={16} />
              )}
            </button>
            
            {section.isOpen && (
              <div className="mt-1 space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`
                        flex items-center pl-8 pr-4 py-2 text-sm
                        ${isActive 
                          ? 'bg-blue-800 text-white font-medium border-l-4 border-blue-500' 
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'}
                      `}
                    >
                      <span className="mr-3">{item.icon}</span>
                      <span>{item.name}</span>
                      {item.badge && (
                        <span className="ml-auto bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Admin info section */}
      <div className="flex-shrink-0 p-4 border-t border-gray-700 bg-gray-800 mt-auto">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 rounded-full p-2">
            <FiUser size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">
              {effectiveIsAdmin ? '系統管理員' : '訪問受限'}
            </p>
            <p className="text-xs text-gray-400">管理面板</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;