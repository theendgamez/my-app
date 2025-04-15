"use client";

import { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import Navbar from '@/components/navbar/Navbar';
import { useRouter, useParams } from 'next/navigation';
import { Users } from '@/types/index';
import { fetchWithAuth } from '@/utils/fetchWithAuth';

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
  
  // Get userId from URL params or from localStorage if not provided
  const urlUserId = params.id as string | undefined;

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      
      // First try to get from localStorage for the current user
      const storedUser = localStorage.getItem('user');
      
      if (!storedUser) {
        // No user in localStorage, redirect to login
        router.push('/login');
        return;
      }
      
      const parsedUser: Users = JSON.parse(storedUser);
      let targetUserId = urlUserId || parsedUser.userId;
      
      // If URL has userId and it's different from logged-in user, verify access rights
      if (urlUserId && urlUserId !== parsedUser.userId) {
        // Here you could add logic to check if the current user has permission
        // to view/edit another user's profile (e.g., for admin users)
        // For now, we'll just use the current user's ID
        targetUserId = parsedUser.userId;
      }
      
      try {
        if (targetUserId === parsedUser.userId) {
          // Use local data for the current user
          setUser(parsedUser);
          setValue('userName', parsedUser.userName || '');
          setValue('email', parsedUser.email || '');
          setValue('phoneNumber', parsedUser.phoneNumber || '');
        } else {
          // Fetch data for a different user
          const response = await fetchWithAuth(`/api/users/${targetUserId}`);
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            setValue('userName', userData.userName || '');
            setValue('email', userData.email || '');
            setValue('phoneNumber', userData.phoneNumber || '');
          } else {
            throw new Error('User not found');
          }
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
      const response = await fetchWithAuth('/api/users/edit', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.userId,
          ...data,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Update localStorage only if this is the current user
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser: Users = JSON.parse(storedUser);
          if (parsedUser.userId === user.userId) {
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