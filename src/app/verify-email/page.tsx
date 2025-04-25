"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/navbar/Navbar';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialToken = searchParams.get('token');
  const successMessage = searchParams.get('message');
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [inputToken, setInputToken] = useState<string>(initialToken || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (successMessage) {
      setMessage(successMessage);
      return;
    }

    if (!initialToken) {
      setError('請輸入你的驗證碼。');
    }
  }, [successMessage, initialToken]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inputToken }),
      });

      const result = await response.json();

      if (response.ok) {
        // Store only userId
        if (result.user && result.user.userId) {
          localStorage.setItem('userId', result.user.userId);
          
          // Store token if provided
          if (result.token) {
            localStorage.setItem('accessToken', result.token);
          }
        }

        setMessage(result.message || '驗證成功！正在跳轉...');
        
        // Navigate to home page
        setTimeout(() => router.push('/'), 2000);
      } else {
        setError(result.error || '驗證失敗，請檢查您的驗證碼是否正確。');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('伺服器發生錯誤，請稍後再試。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="p-8 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-4">驗證您的電子郵件</h1>

      {message && <p className="text-green-500 text-lg mb-4">{message}</p>}
      {error && <p className="text-red-500 text-lg mb-4">{error}</p>}

      <form onSubmit={handleVerify} className="mt-4">
        <input
          type="text"
          placeholder="輸入驗證碼"
          value={inputToken}
          onChange={(e) => setInputToken(e.target.value)}
          className="border border-black p-2 rounded"
          required
        />
        <button type="submit" className="ml-2 bg-blue-500 text-white p-2 rounded" disabled={isLoading}>
          {isLoading ? '驗證中...' : '驗證'}
        </button>
      </form>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<div className="flex justify-center items-center min-h-screen">載入中...</div>}>
        <VerifyEmailContent />
      </Suspense>
    </>
  );
}