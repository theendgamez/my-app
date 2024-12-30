// src/app/login/page.tsx
"use client";

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Navbar from '@/components/navbar/Navbar';


interface FormData {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();
  const router = useRouter();
  const [loginError, setLoginError] = useState('');

  const onSubmit = async (data: FormData) => {
    setLoginError(''); // 每次提交時清除之前的錯誤訊息
    try {
      const response = await fetch('/api/auth/login', { // Updated URL
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const responseData = await response.json();
        localStorage.setItem('user', JSON.stringify(responseData.user));
        router.push('/'); // 登入成功後導向首頁
      } else {
        // 在登入按鈕下方顯示「帳號或密碼不正確」的錯誤訊息
        setLoginError('帳號或密碼不正確');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('登入失敗：發生了一個錯誤。');
    }
  };

  return (
    <>
      <Navbar />
      <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-gray-900">登入</h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm/6 font-medium text-gray-900">
                Email address
              </label>
              <div className="mt-2">
                <input
                  type="email"
                  placeholder="電子郵件"
                  {...register("email", { required: "電子郵件是必填的。" })}
                  className="border border-black p-2 w-full mb-1 rounded"
                />
                {errors.email && <p className="text-red-500 text-sm mb-3">{errors.email.message}</p>}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm/6 font-medium text-gray-900">
                  Password
                </label>
                <div className="text-sm">
                  <a href="#" className="font-semibold text-indigo-600 hover:text-indigo-500">
                    Forgot password?
                  </a>
                </div>
              </div>
              <div className="mt-2">
                <input
                  type="password"
                  placeholder="密碼"
                  {...register("password", { required: "密碼是必填的。" })}
                  className="border border-black p-2 w-full mb-1 rounded"
                />
                {errors.password && <p className="text-red-500 text-sm mb-3">{errors.password.message}</p>}
              </div>
            </div>
            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                登入
              </button>
            </div>
            {/* 在登入按鈕下方顯示錯誤訊息 */}
            {loginError && <p className="text-red-500 text-sm mt-3 text-center">{loginError}</p>}
          </form>
        </div>
      </div>
    </>
  );
}