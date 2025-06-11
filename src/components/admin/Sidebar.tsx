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
import { useTranslations } from '@/hooks/useTranslations';

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
  const { t } = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  
  // Calculate effectiveIsAdmin with useMemo so it can be safely used in dependencies
  const effectiveIsAdmin = useMemo(() => isAdmin || localAdmin, [isAdmin, localAdmin]);
  
  const [sections, setSections] = useState<MenuSection[]>([]);

  useEffect(() => {
    setSections([
      {
        title: t('sidebarDashboard'),
        isOpen: true,
        items: [
          { name: t('sidebarOverview'), icon: <FiHome size={18} />, href: '/admin/dashboard' },
        ]
      },
      {
        title: t('sidebarEventManagement'),
        isOpen: false,
        items: [
          { name: t('sidebarCreateEvent'), icon: <FiPlus size={18} />, href: '/admin/create-event' },
          { name: t('sidebarEventList'), icon: <FiList size={18} />, href: '/admin/events' },
        ]
      },
      {
        title: t('sidebarLotterySystem'),
        isOpen: false,
        items: [
          { name: t('lotteryManagement'), icon: <RiBattery2Line size={18} />, href: '/admin/lottery' },
          { name: t('performDraw'), icon: <RiBattery2Line size={18} />, href: '/admin/lottery/draw' },
        ]
      },
      {
        title: t('sidebarUsersAndTickets'),
        isOpen: false,
        items: [
          { name: t('sidebarUserManagement'), icon: <FiUsers size={18} />, href: '/admin/users' },
          { name: t('sidebarTicketManagement'), icon: <FiTag size={18} />, href: '/admin/tickets' },
          { name: t('sidebarOrderManagement'), icon: <FiShoppingBag size={18} />, href: '/admin/orders' },
          {
            name: t('sidebarScanTickets'),
            href: '/admin/tickets/scan',
            icon: <FiCamera size={18} />,
          },
        ]
      },
      {
        title: t('sidebarFinance'),
        isOpen: false,
        items: [
          { name: t('paymentRecords'), icon: <FiDollarSign size={18} />, href: '/admin/payments' },
          { name: t('sidebarFinancialReports'), icon: <FiBarChart2 size={18} />, href: '/admin/reports' },
        ]
      },
      {
        title: t('sidebarSystemSettingsSection'),
        isOpen: false,
        items: [
          { name: t('systemSettings'), icon: <FiSettings size={18} />, href: '/admin/settings' },
        ]
      },
      {
        title: t('sidebarBlockchainManagement'),
        isOpen: false,
        items: [
          {
            name: t('sidebarBlockchain'),
            href: '/admin/blockchain',
            icon: <FiLink size={18} />,
          },
        ]
      },
    ]);
  }, [t]);


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

  // Base classes for the sidebar container
  const sidebarContainerBaseClasses = `fixed z-30 w-64 bg-white dark:bg-neutral-800 shadow-md transition-transform duration-300 overflow-y-auto`;
  
  // Desktop specific classes
  // Use 'top-navbar' which corresponds to '4rem' defined in tailwind.config.ts
  // Use direct values in calc() for Tailwind JIT to parse correctly
  const desktopTopClass = "top-navbar"; // Uses theme.spacing.navbar (4rem)
  const desktopHeightClass = "h-[calc(100vh-4rem-6rem)]"; // 4rem navbar + 6rem footer estimate
  const desktopTransformOpen = "transform translate-x-0";
  const desktopTransformClosed = "transform -translate-x-full";

  const desktopOpenClasses = `${sidebarContainerBaseClasses} ${desktopTopClass} ${desktopHeightClass} ${desktopTransformOpen} left-0`;
  const desktopClosedClasses = `${sidebarContainerBaseClasses} ${desktopTopClass} ${desktopHeightClass} ${desktopTransformClosed} left-0`;

  // Mobile specific classes (overlay style)
  const mobileContainerBaseClasses = `fixed z-40 w-64 bg-white dark:bg-neutral-800 shadow-lg transition-transform duration-300 overflow-y-auto`;
  const mobileTopClass = "top-navbar"; // Starts below main navbar (4rem)
  const mobileHeightClass = "h-[calc(100vh-4rem)]"; // Extends to viewport bottom, accounting for 4rem navbar
  const mobileTransformOpen = "transform translate-x-0";
  const mobileTransformClosed = "transform -translate-x-full";
  
  const mobileOpenClasses = `${mobileContainerBaseClasses} ${mobileTopClass} ${mobileHeightClass} ${mobileTransformOpen} inset-x-0`;
  const mobileClosedClasses = `${mobileContainerBaseClasses} ${mobileTopClass} ${mobileHeightClass} ${mobileTransformClosed} inset-x-0`;


  const generatedSidebarClasses = isMobile
    ? isOpen
      ? mobileOpenClasses
      : mobileClosedClasses
    : isOpen
      ? desktopOpenClasses
      : desktopClosedClasses;

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
      <aside className={generatedSidebarClasses}> {/* Use generated classes */}
        {isMobile && (
          <div className="p-4 border-b dark:border-neutral-700">
            <button
              onClick={toggleSidebar}
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
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
                    className="flex items-center justify-between w-full px-2 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white focus:outline-none"
                    onClick={() => toggleSection(index)}
                  >
                    <span className="text-sm font-medium">{section.title}</span>
                    {section.isOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                  </button>
                ) : (
                  <div className="px-2 py-2 text-gray-600 dark:text-gray-400 text-center text-xs">
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
                              ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium' 
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:text-gray-900 dark:hover:text-white'
                          }`}
                          title={!isOpen ? item.name : undefined}
                          onClick={() => isMobile && toggleSidebar()}
                        >
                          <span className={`${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'} ${isOpen ? 'mr-3' : ''}`}>
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