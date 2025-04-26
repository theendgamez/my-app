'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/navbar/Navbar';

export default function ResendVerificationClient() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('請輸入電子郵件地址');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '重新發送驗證郵件失敗');
      } else {
        setSuccess(true);
      }
    } catch (err) {
      console.error('Error resending verification:', err);
      setError('發送驗證郵件時出現錯誤。請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto p-4 pt-24 max-w-md">
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 text-green-500 mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-4">驗證郵件已發送！</h1>
            <p className="text-gray-600 mb-6">
              我們已將驗證碼發送至 {email}。請檢查您的收件箱並輸入驗證碼。
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/verify-email" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500 text-center">
                前往驗證
              </Link>
              <Link href="/" className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-center">
                返回首頁
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4 pt-24 max-w-md">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-6 text-center">重新發送驗證郵件</h1>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm/6 font-medium text-gray-900 mb-1">
                電子郵件地址
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border border-black block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                placeholder="請輸入您的電子郵件"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full justify-center rounded-md px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs bg-indigo-600 hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-indigo-300 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin h-5 w-5 border-2 border-t-transparent border-white rounded-full mr-2"></div>
                  處理中...
                </div>
              ) : (
                '發送驗證郵件'
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-indigo-600 hover:text-indigo-500">
              返回登入
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
