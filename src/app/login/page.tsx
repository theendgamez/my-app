// src/app/login/page.tsx
"use client";

import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Navbar from '@/components/navbar/Navbar';

interface FormData {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect');
  const [loginError, setLoginError] = useState('');
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Clear redirect counters when login page loads directly
    if (!isProcessingRedirect) {
      sessionStorage.removeItem('redirect_attempt_count');
      sessionStorage.removeItem('redirected_to_login');
    }
    
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    
    try {
      const user = JSON.parse(userStr);
      if (user && user.userId) {
        setIsProcessingRedirect(true);
        if (redirectPath) {
          setTimeout(() => {
            router.push(redirectPath);
          }, 100);
        } else {
          router.push('/');
        }
      }
    } catch (e) {
      localStorage.removeItem('user');
    }
  }, [redirectPath, router, isProcessingRedirect]);

  const onSubmit = async (data: FormData) => {
    setLoginError('');
    setIsSubmitting(true);
    
    try {
      // API call to authenticate user
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Login failed');
      }

      // Handle successful login
      if (result.user) {
        // Store user data in localStorage
        localStorage.setItem('user', JSON.stringify(result.user));
        
        // Clear any redirect flags
        sessionStorage.removeItem('redirect_attempt_count');
        sessionStorage.removeItem('redirected_to_login');
        sessionStorage.removeItem('last_redirect_time');
        
        // Redirect to intended destination or home
        if (redirectPath) {
          router.push(redirectPath);
        } else {
          router.push('/');
        }
      }
    } catch (err: any) {
      setLoginError(err.message || "Invalid email or password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-gray-900">Login</h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm/6 font-medium text-gray-900">Email</label>
              <div className="mt-2">
                <input
                  id="email"
                  type="email"
                  autoComplete="off"
                  {...register("email", { required: "Email is required" })}
                  className="border border-black block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                />
                {errors.email && <p className="text-red-500 text-sm mb-3">{errors.email.message}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm/6 font-medium text-gray-900">Password</label>
              <div className="mt-2">
                <input
                  id="password"
                  type="password"
                  autoComplete="off"
                  {...register("password", { required: "Password is required" })}
                  className="border border-black block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                />
                {errors.password && <p className="text-red-500 text-sm mb-3">{errors.password.message}</p>}
              </div>
            </div>

            {loginError && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-700">{loginError}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex w-full justify-center rounded-md px-3 py-1.5 text-sm/6 font-semibold text-white shadow-sm ${
                  isSubmitting ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                }`}
              >
                {isSubmitting ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}