"use client";

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FaTachometerAlt, 
  FaCalendarAlt, 
  FaUsers, 
  FaTicketAlt, 
  FaRandom,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaPlus,
  FaList,
  FaChartBar,
  FaUserCog,
  FaUserPlus,
  FaCog,
  FaClipboardCheck
} from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/utils/fetchWithAuth';

interface SidebarProps {
  isAdmin: boolean;
}

interface SubMenuItem {
  name: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
  description?: string;
}

interface MenuItem {
  name: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
  description?: string;
  subItems?: SubMenuItem[];
}

export default function AdminSidebar(props: SidebarProps) {
  const { isAdmin } = props;
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const menuItems: MenuItem[] = [
    { 
      name: '主控台', 
      icon: FaTachometerAlt, 
      href: '/admin/dashboard',
      description: '查看活動和票券銷售概況'
    },
    { 
      name: '活動管理', 
      icon: FaCalendarAlt, 
      href: '/admin/events',
      description: '管理所有活動',
      subItems: [
        { name: '活動列表', icon: FaList, href: '/admin/events' },
        { name: '建立活動', icon: FaPlus, href: '/admin/create-event' },
        { name: '活動統計', icon: FaChartBar, href: '/admin/events/stats' }
      ]
    },
    { 
      name: '用戶管理', 
      icon: FaUsers, 
      href: '/admin/users',
      description: '管理用戶帳號',
      subItems: [
        { name: '用戶列表', icon: FaList, href: '/admin/users' },
        { name: '新增用戶', icon: FaUserPlus, href: '/admin/users/create' },
        { name: '用戶權限', icon: FaUserCog, href: '/admin/users/roles' }
      ]
    },
    { 
      name: '票券管理', 
      icon: FaTicketAlt, 
      href: '/admin/tickets',
      description: '管理已售出的票券',
      subItems: [
        { name: '票券列表', icon: FaList, href: '/admin/tickets' },
        { name: '退票管理', icon: FaClipboardCheck, href: '/admin/tickets/refunds' }
      ]
    },
    { 
      name: '抽籤管理', 
      icon: FaRandom, 
      href: '/admin/lottery',
      description: '管理抽籤活動與結果',
      subItems: [
        { name: '抽籤活動', icon: FaList, href: '/admin/lottery' },
        { name: '設定抽籤', icon: FaCog, href: '/admin/lottery/settings' }
      ]
    },
  ];

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(`${path}/`);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleSubMenu = (href: string) => {
    setExpandedMenus(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href) 
        : [...prev, href]
    );
  };

  // Auto-expand parent menu when on a subpage
  useEffect(() => {
    if (pathname) {
      menuItems.forEach(item => {
        if (item.subItems && item.subItems.some(subItem => isActive(subItem.href))) {
          setExpandedMenus(prev => 
            prev.includes(item.href) ? prev : [...prev, item.href]
          );
        }
      });
    }
  }, [pathname]);

  const handleLogout = async () => {
    if (window.confirm('確定要登出嗎？')) {
      try {
        // Call the logout API
        await fetchWithAuth('/api/auth/logout', {
          method: 'POST'
        });
        
        // Clear credentials from localStorage
        localStorage.removeItem('userId');
        localStorage.removeItem('accessToken');
        
        // Redirect to login page
        router.push('/login');
      } catch (error) {
        console.error('Logout error:', error);
        // Fallback if API call fails
        window.location.href = '/login';
      }
    }
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 z-40 m-4">
        <button 
          onClick={toggleMobileMenu} 
          className="p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none"
        >
          {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {/* Sidebar backdrop for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={toggleMobileMenu}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 z-30 h-full bg-gray-800 text-white w-64 transition-transform duration-300 ease-in-out overflow-y-auto
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-5 border-b border-gray-700">
          <h2 className="text-xl font-bold">管理員控制台</h2>
        </div>

        <nav className="mt-5">
          <ul>
            {menuItems.map((item) => (
              <li key={item.href} className="mb-1">
                <div className="flex flex-col">
                  <button
                    onClick={() => item.subItems ? toggleSubMenu(item.href) : router.push(item.href)}
                    className={`
                      flex items-center justify-between px-5 py-3 transition-colors w-full
                      ${isActive(item.href) 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-300 hover:bg-gray-700'
                      }
                    `}
                  >
                    <div className="flex items-center">
                      <item.icon className="mr-3" />
                      {item.name}
                    </div>
                    {item.subItems && (
                      <span className="ml-2">
                        {expandedMenus.includes(item.href) ? 
                          '▼' : '▶'
                        }
                      </span>
                    )}
                  </button>
                  
                  {/* Sub-menu items */}
                  {item.subItems && expandedMenus.includes(item.href) && (
                    <ul className="pl-5 bg-gray-900">
                      {item.subItems.map(subItem => (
                        <li key={subItem.href}>
                          <Link
                            href={subItem.href}
                            className={`
                              flex items-center px-5 py-2 text-sm transition-colors
                              ${isActive(subItem.href) 
                                ? 'text-blue-400 bg-gray-800' 
                                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                              }
                            `}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <subItem.icon className="mr-2 text-xs" />
                            {subItem.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </nav>

        <div className="absolute bottom-0 w-full p-5 border-t border-gray-700">
          <button 
            className="flex items-center text-gray-300 hover:text-white w-full"
            onClick={handleLogout}
          >
            <FaSignOutAlt className="mr-3" />
            登出系統
          </button>
        </div>
      </div>
    </>
  );
}
