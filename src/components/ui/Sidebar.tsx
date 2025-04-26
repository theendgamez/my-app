"use client";

import React from 'react';
import Link from 'next/link';
import { FaHome, FaPlusCircle, FaRandom, FaCog } from 'react-icons/fa';

// Add proper prop types
interface SidebarProps {
  isAdmin?: boolean;  // Make it optional with '?'
}

// Update component to use the interface
const Sidebar: React.FC<SidebarProps> = ({ isAdmin = false }) => {
  // Define regular user menu items
  const userMenuItems = [
    { name: '首頁', icon: FaHome, href: '/' },
    { name: '抽籤', icon: FaRandom, href: '/lottery' },
  ];
  
  // Define admin-only menu items
  const adminMenuItems = [
    { name: '建立活動', icon: FaPlusCircle, href: '/admin/create-event' },
    { name: '活動列表', icon: FaHome, href: '/admin/events' },
    { name: '票券管理', icon: FaHome, href: '/admin/tickets' },
    { name: '管理', icon: FaCog, href: '/settings' },
  ];
  
  // Choose which menu items to display based on admin status
  const menuItems = isAdmin ? [...userMenuItems, ...adminMenuItems] : userMenuItems;

  return (
    <div className="w-64 bg-gray-800 text-white h-[calc(100vh-4rem)] fixed left-0 top-16">
      <div className="flex items-center justify-center h-16 border-b border-gray-700">
        <h2 className="text-xl font-bold">
          {isAdmin ? '管理員面板' : '用戶面板'}
        </h2>
      </div>
      <nav className="mt-4">
        {menuItems.map((item) => (
          <Link
            href={item.href}
            key={item.name}
            className="flex items-center px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            <item.icon className="h-6 w-6 mr-3" />
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;