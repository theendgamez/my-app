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
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const params = useParams();
  
  // Get userId from URL params or from localStorage
  const urlUserId = params.id as string | undefined;

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      
      // Get userId from localStorage
      const storedUserId = localStorage.getItem('userId');
      
      if (!storedUserId) {
        // No userId in localStorage, redirect to login
        router.push('/login');
        return;
      }
      
      // Use URL userId if provided, otherwise use stored userId
      const targetUserId = urlUserId || storedUserId;
      
      try {
        // Fetch user data from API
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`/api/users/${targetUserId}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
            'x-user-id': storedUserId
          },
          credentials: 'omit'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }
        
        const userData = await response.json();
        
        // Type guard to ensure we have valid user data
        if (userData && typeof userData === 'object' && 'userId' in userData) {
          setUser(userData as Users);
          setValue('userName', userData.userName || '');
          setValue('email', userData.email || '');
          setValue('phoneNumber', userData.phoneNumber || '');
        } else {
          throw new Error('Invalid user data received');
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
        setError('無法載入用戶資料');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router, setValue, urlUserId]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setError('');
    setSuccess('');

    if (!user) {
      setError('用戶資料不存在');
      return;
    }

    try {
      const response = await fetch(`/api/users/${user.userId}`, {
        method: "PATCH", // Use PATCH instead of POST
        body: JSON.stringify({
          userName: data.userName,
          email: data.email,
          phoneNumber: data.phoneNumber
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      const result = await response.json();

      if (response.ok) {
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
        
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
          </div>
        ) : user ? ( 
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
          <div className="text-center">
            <p className="text-red-500">無法載入用戶資料，請重新登入</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              返回登入頁面
            </button>
          </div>
        )}
      </main>
    </div>
  );
}