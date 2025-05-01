// src/app/login/page.tsx
"use client";

import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import Navbar from '@/components/navbar/Navbar';

// Loading fallback component
const LoginFormSkeleton = () => (
  <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm animate-pulse">
    <div className="space-y-6">
      <div>
        <div className="h-5 w-20 bg-gray-200 rounded mb-2"></div>
        <div className="h-10 w-full bg-gray-200 rounded"></div>
      </div>
      <div>
        <div className="h-5 w-20 bg-gray-200 rounded mb-2"></div>
        <div className="h-10 w-full bg-gray-200 rounded"></div>
      </div>
      <div className="h-10 w-full bg-gray-200 rounded"></div>
    </div>
  </div>
);

// Form component to be wrapped in Suspense
const LoginForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect');
  const [loginError, setLoginError] = useState('');
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user is already logged in (using userId only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Clear redirect counters when login page loads directly
    if (!isProcessingRedirect) {
      localStorage.removeItem('redirect_attempt_count');
      localStorage.removeItem('redirected_to_login');
      localStorage.removeItem('last_redirect_time');
    }
    
    // Check for userId in localStorage instead of full user object
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    
    // If userId exists, user is logged in
    setIsProcessingRedirect(true);
    
    // Add redirect loop protection - track redirect attempts
    const redirectAttemptCount = parseInt(localStorage.getItem('redirect_attempt_count') || '0');
    if (redirectAttemptCount > 5) {
      // Too many redirects, send user to home page to break the loop
      console.warn('Too many redirect attempts detected. Breaking redirect loop.');
      localStorage.removeItem('redirect_attempt_count');
      router.push('/');
      return;
    }
    
    // Increment redirect counter
    localStorage.setItem('redirect_attempt_count', (redirectAttemptCount + 1).toString());
    
    if (redirectPath) {
      setTimeout(() => {
        router.push(redirectPath);
      }, 100);
    } else {
      router.push('/');
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

      // Type guard for the user object
      if (result.user && typeof result.user === 'object' && 'userId' in result.user) {
        // Store only userId in localStorage
        localStorage.setItem('userId', result.user.userId);
        
        // Store access token for API auth
        if (result.accessToken) {
          localStorage.setItem('accessToken', result.accessToken);
        }
        
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
      } else {
        throw new Error('Invalid user data received from server');
      }
    } catch (err: unknown) {
      setLoginError(
        err instanceof Error ? err.message : "Invalid email or password"
      );
      console.error('Login error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
  );
};

interface FormData {
  email: string;
  password: string;
}

// Main login page component using minimalistic localStorage approach
// Only stores the user ID in localStorage for improved security
export default function LoginPage() {
  return (
    <>
      <Navbar />
      <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-gray-900">Login</h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          {/* Using Suspense boundary for better performance with client components */}
          <Suspense fallback={<LoginFormSkeleton />}>
            {/* LoginForm component handles localStorage-based authentication */}
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </>
  );
}