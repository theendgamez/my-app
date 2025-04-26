'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/navbar/Navbar';

export default function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get('token');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    const verifyEmail = async () => {
      // If no token provided, show manual input form
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || '電子郵件驗證失敗');
          setErrorDetails(data.details || null);
        } else {
          setSuccess(true);
          
          // If already logged in, redirect to dashboard after a short delay
          if (localStorage.getItem('accessToken')) {
            setTimeout(() => {
              router.push('/user/dashboard');
            }, 3000);
          }
        }
      } catch (err) {
        console.error('Verification error:', err);
        setError('驗證過程中發生錯誤，請稍後再試。');
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [token, router]);

  const handleManualVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const manualToken = formData.get('manualToken') as string;
    
    if (!manualToken) {
      setError('請輸入驗證碼');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: manualToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '電子郵件驗證失敗');
        setErrorDetails(data.details || null);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      console.error('Manual verification error:', err);
      setError('驗證過程中發生錯誤，請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4 pt-24 max-w-md">
        <div className="bg-white p-8 rounded-lg shadow-md">
          {loading ? (
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">驗證電子郵件</h1>
              <p className="text-gray-600 mb-6">正在驗證您的電子郵件...</p>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            </div>
          ) : success ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 text-green-500 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold mb-4">電子郵件驗證成功！</h1>
              <p className="text-gray-600 mb-6">您的電子郵件已成功驗證。現在您可以完整使用所有功能。</p>
              <div className="flex flex-col gap-3">
                <Link href="/login" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500 text-center">
                  前往登入
                </Link>
                <Link href="/" className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-center">
                  返回首頁
                </Link>
              </div>
            </div>
          ) : token ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-red-100 text-red-500 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold mb-4">電子郵件驗證失敗</h1>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
              {errorDetails && <p className="text-gray-600 mb-6">{errorDetails}</p>}
              <div className="flex flex-col gap-3">
                <Link href="/resend-verification" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500 text-center">
                  重新發送驗證郵件
                </Link>
                <Link href="/login" className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-center">
                  返回登入
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold mb-4">驗證電子郵件</h1>
              <p className="text-gray-600 mb-6">請輸入您收到的驗證碼：</p>
              
              <form onSubmit={handleManualVerify}>
                <div className="mb-4">
                  <input
                    type="text"
                    name="manualToken"
                    className="border border-black block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                    placeholder="請輸入驗證碼"
                    required
                  />
                </div>
                
                {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
                
                <button 
                  type="submit"
                  className="w-full justify-center rounded-md px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs bg-indigo-600 hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  驗證
                </button>
                
                <div className="mt-4 text-center">
                  <Link href="/resend-verification" className="text-sm text-indigo-600 hover:text-indigo-500">
                    沒有收到驗證碼？重新發送
                  </Link>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
