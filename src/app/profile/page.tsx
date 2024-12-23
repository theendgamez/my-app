"use client";

import { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import Navbar from '@/components/Navbar';
import { useRouter } from 'next/navigation';
import { Users } from '@/app/api/types/index';

interface FormData {
  userName: string;
  email: string;
  phoneNumber: string;
  // Add other necessary fields
}

export default function ProfilePage() {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>();
  const [user, setUser] = useState<Users | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser: Users = JSON.parse(storedUser);
      setUser(parsedUser);
      setValue('userName', parsedUser.userName || '');
      setValue('email', parsedUser.email || '');
      setValue('phoneNumber', parsedUser.phoneNumber || '');
      // Initialize other fields
    } else {
      router.push('/login');
    }
  }, [router, setValue]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/updateProfile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.userId || '',
          ...data,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        localStorage.setItem('user', JSON.stringify(result.user));
        setUser(result.user);
        setSuccess('個人資料更新成功');
      } else {
        setError(result.error || '更新失敗，請重試');
      }
    } catch (err) {
      console.error('更新個人資料時出錯:', err);
      setError('發生錯誤，請稍後再試');
    }
  };

  return (
    <div>
      <Navbar />
      <main className="p-8 flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-4">個人資料</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md">
          <div className="mb-4">
            <label htmlFor="userName" className="block text-gray-700 mb-2">
              用戶名
            </label>
            <input
              type="text"
              id="userName"
              {...register('userName', { required: true })}
              className="w-full p-2 border rounded"
            />
            {errors.userName && <span className="text-red-500 text-sm">此欄位為必填</span>}
          </div>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 mb-2">
              電子郵件
            </label>
            <input
              type="email"
              id="email"
              {...register('email', { required: true })}
              className="w-full p-2 border rounded"
            />
            {errors.email && <span className="text-red-500 text-sm">此欄位為必填</span>}
          </div>
          <div className="mb-4">
            <label htmlFor="phoneNumber" className="block text-gray-700 mb-2">
              電話號碼
            </label>
            <input
              type="tel"
              id="phoneNumber"
              {...register('phoneNumber', { required: true })}
              className="w-full p-2 border rounded"
            />
            {errors.phoneNumber && <span className="text-red-500 text-sm">此欄位為必填</span>}
          </div>
          {/* Add other fields as necessary */}
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            更新個人資料
          </button>
          {error && <p className="text-red-500 text-sm mt-3 text-center">{error}</p>}
          {success && <p className="text-green-500 text-sm mt-3 text-center">{success}</p>}
        </form>
      </main>
    </div>
  );
}