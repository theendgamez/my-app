'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/navbar/Navbar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Content component that uses useSearchParams
function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('未提供驗證碼');
      return;
    }

    const verifyEmail = async () => {
      setVerifying(true);
      try {
        const response = await fetch(`/api/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const result = await response.json();

        if (response.ok) {
          setMessage(result.message || '驗證成功！');
          
          // Store user data if provided
          if (result.user && result.user.userId) {
            localStorage.setItem('userId', result.user.userId);
            
            // Store token if provided
            if (result.token) {
              localStorage.setItem('accessToken', result.token);
            }
          }
          
          // Redirect to home page after successful verification
          setTimeout(() => router.push('/'), 2000);
        } else {
          setError(result.error || '驗證失敗，請檢查您的驗證碼是否正確。');
        }
      } catch (err) {
        console.error('Verification error:', err);
        setError('伺服器發生錯誤，請稍後再試。');
      } finally {
        setVerifying(false);
      }
    };

    verifyEmail();
  }, [token, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center">電子郵件驗證</h1>
        
        {verifying ? (
          <div className="flex flex-col items-center py-8">
            <LoadingSpinner size="medium" />
            <p className="mt-4 text-gray-600">正在驗證您的電子郵件...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <p className="text-red-700">{error}</p>
            <button 
              onClick={() => router.push('/verify-email')}
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded"
            >
              手動輸入驗證碼
            </button>
          </div>
        ) : message ? (
          <div className="bg-green-50 border-l-4 border-green-500 p-4">
            <p className="text-green-700">{message}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function VerifyPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner size="large" />
        </div>
      }>
        <VerifyContent />
      </Suspense>
    </>
  );
}
