"use client";

import { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import Navbar from '@/components/navbar/Navbar';
import { useRouter, useParams } from 'next/navigation';
import { Users } from '@/types/index';

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
  const params = useParams();
  const userId = params.id as string;

  useEffect(() => {
    const fetchUserData = async () => {
      // First try to get from localStorage for the current user
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser: Users = JSON.parse(storedUser);
        
        // Check if the URL id matches the logged-in user
        if (parsedUser.userId === userId) {
          setUser(parsedUser);
          setValue('userName', parsedUser.userName || '');
          setValue('email', parsedUser.email || '');
          setValue('phoneNumber', parsedUser.phoneNumber || '');
          return;
        }
      }
      
      // If no match or no local storage, try to fetch the user data from API
      try {
        const response = await fetch(`/api/users/${userId}`);
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setValue('userName', userData.userName || '');
          setValue('email', userData.email || '');
          setValue('phoneNumber', userData.phoneNumber || '');
        } else {
          // User not found or not authorized
          router.push('/login');
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
        setError('無法載入用戶資料');
        router.push('/login');
      }
    };

    if (userId) {
      fetchUserData();
    } else {
      router.push('/login');
    }
  }, [router, setValue, userId]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/users/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          ...data,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Update localStorage only if this is the current user
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser: Users = JSON.parse(storedUser);
          if (parsedUser.userId === userId) {
            localStorage.setItem('user', JSON.stringify({...parsedUser, ...result.user}));
          }
        }
        
        setUser(prev => prev ? {...prev, ...result.user} : result.user);
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
      <main className="p-8 pt-20 flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-4">個人資料</h1>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        {success && <p className="text-green-500 text-sm mb-4">{success}</p>}
        
        {user ? (
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
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              更新個人資料
            </button>
          </form>
        ) : (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
          </div>
        )}
      </main>
    </div>
  );
}