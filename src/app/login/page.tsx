// src/app/login/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/navbar/Navbar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import { AuthProvider } from '@/context/AuthContext'; // Import AuthProvider
import { Suspense } from 'react';

interface FormData {
  email: string;
  password: string;
}

// Create a client component that uses the auth hook
function LoginForm() {
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting } 
  } = useForm<FormData>();
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, loading: authLoading, error: authError } = useAuth();
  const [loginError, setLoginError] = useState('');
  const [requiresVerification, setRequiresVerification] = useState<{userId: string} | null>(null);

  // Get redirect URL from query parameters if available
  const redirect = searchParams.get('redirect') || '/';

  // Check if user is already logged in
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push(redirect);
    }
  }, [isAuthenticated, authLoading, router, redirect]);

  // Set error from auth context if available
  useEffect(() => {
    if (authError) {
      setLoginError(authError);
    }
  }, [authError]);

  const onSubmit = async (data: FormData) => {
    setLoginError('');
    setRequiresVerification(null);
    
    try {
      await login(data.email, data.password);
      // If we reach this point, login was successful and redirect will happen via the useEffect
    } catch (error: unknown) {
      console.error('Login error:', error);
      
      // Define proper type for our application error
      const loginError = error as { message?: string; userId?: string };
      
      // Check if the error is due to unverified email
      if (loginError.message?.includes('驗證') && loginError.userId) {
        setRequiresVerification({ userId: loginError.userId });
      } else {
        setLoginError(loginError.message || '登入失敗：發生了一個錯誤');
      }
    }
  };

  // Redirect to email verification page
  const handleVerifyEmail = () => {
    if (requiresVerification) {
      router.push(`/verify-email?userId=${requiresVerification.userId}`);
    }
  };

  // Show loading while checking authentication status
  if (authLoading) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-screen justify-center items-center">
          <LoadingSpinner size="large" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="flex min-h-screen flex-1 flex-col justify-center px-6 py-12 lg:px-8 bg-gray-50">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            登入您的帳戶
          </h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          {requiresVerification ? (
            <div className="bg-white p-6 shadow rounded-lg">
              <Alert 
                type="warning" 
                title="需要驗證電子郵件" 
                message="您需要先驗證電子郵件才能登入。請檢查您的收件匣，或點擊下方按鈕重新獲取驗證碼。" 
              />
              <div className="mt-6">
                <button
                  onClick={handleVerifyEmail}
                  className="flex w-full justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  前往驗證頁面
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 shadow rounded-lg">
              {loginError && <Alert type="error" message={loginError} onClose={() => setLoginError('')} />}
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
                  電子郵件
                </label>
                <div className="mt-2">
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...register("email", { 
                      required: "請輸入電子郵件",
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "請輸入有效的電子郵件地址"
                      }
                    })}
                    className={`block w-full rounded-md border-0 py-1.5 px-2 text-gray-900 shadow-sm ring-1 ring-inset ${errors.email ? 'ring-red-500' : 'ring-gray-300'} focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6`}
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900">
                    密碼
                  </label>
                  <div className="text-sm">
                    <Link href="/forgot-password" className="font-semibold text-blue-600 hover:text-blue-500">
                      忘記密碼？
                    </Link>
                  </div>
                </div>
                <div className="mt-2">
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    {...register("password", { 
                      required: "請輸入密碼",
                      minLength: {
                        value: 6,
                        message: "密碼至少需要6個字符"
                      }
                    })}
                    className={`block w-full rounded-md border-0 py-1.5 px-2 text-gray-900 shadow-sm ring-1 ring-inset ${errors.password ? 'ring-red-500' : 'ring-gray-300'} focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6`}
                  />
                  {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="mr-2">
                        <LoadingSpinner size="small" />
                      </div>
                      處理中...
                    </>
                  ) : '登入'}
                </button>
              </div>
            </form>
          )}

          <p className="mt-10 text-center text-sm text-gray-500">
            還沒有帳戶？{' '}
            <Link href="/register" className="font-semibold leading-6 text-blue-600 hover:text-blue-500">
              立即註冊
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

// Wrap the login page with AuthProvider
export default function LoginPage() {
  return (
    <AuthProvider>
      <Navbar />
      <div className="flex justify-center items-center min-h-screen">
        <Suspense fallback={<LoadingSpinner size="large" />}>
          <LoginForm />
        </Suspense>
      </div>
    </AuthProvider>
  );
}