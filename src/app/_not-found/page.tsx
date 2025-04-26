import React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';


// Simple static 404 content without hooks
const Static404Content = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 px-4 sm:px-6 lg:px-8">
    <div className="max-w-md w-full bg-white shadow-md rounded-lg p-8 text-center">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">404</h1>
      <p className="text-xl text-gray-700 mb-6">頁面未找到</p>
      <p className="text-gray-500 mb-8">
        您嘗試訪問的頁面不存在或已被移動
      </p>
      <Link 
        href="/"
        className="inline-block px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
      >
        返回首頁
      </Link>
    </div>
  </div>
);

// Dynamic import for the navbar (which may use hooks)
const NavbarClient = dynamic(() => import('@/components/navbar/Navbar'), {
  ssr: false,
  loading: () => null
});

// Main component that doesn't use any hooks directly
export default function NotFoundPage() {
  return (
    <>
      <NavbarClient />
      <Static404Content />
    </>
  );
}
