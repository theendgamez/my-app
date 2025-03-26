"use client";

import Link from 'next/link';
import { Fragment } from 'react';
import { Users } from '@/types';
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { FiChevronDown } from 'react-icons/fi';

const UserMenu = ({ user, onLogout }: { user: Users; onLogout: () => void }) => (
  <Menu as="div" className="relative">
    <MenuButton className="flex items-center space-x-2 transition duration-200 text-white">
      <span>歡迎，{user.userName}</span>
      <FiChevronDown className="h-5 w-5" />
    </MenuButton>
    <Transition
      as={Fragment}
      enter="transition ease-out duration-100"
      enterFrom="transform opacity-0 scale-95"
      enterTo="transform opacity-100 scale-100"
      leave="transition ease-in duration-75"
      leaveFrom="transform opacity-100 scale-100"
      leaveTo="transform opacity-0 scale-95"
    >
      <MenuItems className="absolute right-0 mt-2 w-48 origin-top-right bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none divide-y divide-gray-100">
        <div className="py-1">
          <MenuItem>
            {({ active }) => (
              <Link
                href={`/user/${user.userId}/profile`}
                className={`${active ? 'bg-gray-100' : ''} block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition duration-200`}
              >
                個人資料
              </Link>
            )}
          </MenuItem>
          <MenuItem>
            {({ active }) => (
              <button
                onClick={onLogout}
                className={`${active ? 'bg-gray-100' : ''} block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition duration-200`}
              >
                登出
              </button>
            )}
          </MenuItem>
        </div>
      </MenuItems>
    </Transition>
  </Menu>
);

export default UserMenu;