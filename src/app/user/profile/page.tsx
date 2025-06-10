"use client";

import { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import Navbar from '@/components/navbar/Navbar';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTranslations } from '@/hooks/useTranslations';

interface FormData {
  userName: string;
  email: string;
  phoneNumber: string;
}

export default function ProfilePage() {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>();
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();
  const params = useParams();
  const { t } = useTranslations();
  
  // Use Auth Context
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  // Get userId from URL params or from context
  const urlUserId = params.id as string | undefined;

  useEffect(() => {
    // Check authentication first
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    
    // If authenticated and we have the user data, set form values
    if (!authLoading && isAuthenticated && user) {
      // Use URL userId if provided, otherwise use context user
      const targetUserId = urlUserId || user.userId;
      
      // If trying to view another user's profile, need to check permissions
      if (targetUserId !== user.userId) {
        // Add permission check here if needed
      }
      
      // Set form values from context user
      setValue('userName', user.userName || '');
      setValue('email', user.email || '');
      
      // Handle phone number - check if it exists in user context first
      if (user.phoneNumber) {
        setValue('phoneNumber', user.phoneNumber);
      } else {
        // If phone number is missing from context, fetch directly from API
        const fetchUserDataDirectly = async (userId: string) => {
          try {
            const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
            
            const response = await fetch(`/api/users/${userId}`, {
              headers: {
                'Authorization': `Bearer ${accessToken || ''}`,
                'x-user-id': userId
              }
            });
            
            if (response.ok) {
              const userData = await response.json();
              console.log('Fetched user data:', userData); // Debug log
              
              // Handle both direct data and nested data structure
              const phoneNumber = userData.phoneNumber || userData.data?.phoneNumber;
              if (phoneNumber) {
                setValue('phoneNumber', phoneNumber);
              }
            } else {
              console.error('Failed to fetch user data:', response.status);
            }
          } catch (err) {
            console.error('Error fetching user data directly:', err);
          }
        };
        
        fetchUserDataDirectly(targetUserId);
      }
    }
  }, [isAuthenticated, authLoading, user, setValue, urlUserId, router]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setError('');
    setSuccess('');

    if (!user) {
      setError(t('profileErrorUserNotFound'));
      return;
    }

    try {
      setLoading(true);
      // Safe localStorage access
      const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      
      // Log what we're sending
      console.log('Updating profile with data:', data);
      
      const response = await fetch(`/api/users/${user.userId}`, {
        method: "PATCH",
        body: JSON.stringify({
          userName: data.userName,
          email: data.email,
          phoneNumber: data.phoneNumber
        }),
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
          'x-user-id': user.userId
        },
        credentials: 'include' 
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(t('profileUpdateSuccess'));
      } else {
        setError(result.error || t('profileUpdateFailed'));
      }
    } catch (err) {
      console.error('更新個人資料時出錯:', err); // This console log should also be translated or made generic if user-facing
      setError(t('profileUpdateErrorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <main className="p-8 pt-20 flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-4">{t('profilePageTitle')}</h1>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        {success && <p className="text-green-500 text-sm mb-4">{success}</p>}
        
        {/* Add debug information (remove in production) 
        /*{debugInfo && (
          <div className="bg-gray-100 p-2 rounded text-xs mb-4 w-full max-w-md">
            <strong>Debug Info:</strong>
            <pre>{debugInfo}</pre>
          </div>
        )}*/}
        
        {authLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
          </div>
        ) : isAuthenticated && user ? ( 
          <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md">
            <div className="mb-4">
              <label htmlFor="userName" className="block text-sm font-medium text-gray-700">{t('userName')}</label>
              <input
                type="text"
                id="userName"
                {...register('userName', { required: true })}
                className="w-full p-2 border rounded"
              />
              {errors.userName && <span className="text-red-500 text-sm">{t('formErrorRequired')}</span>}
            </div>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">{t('email')}</label>
              <input
                type="email"
                id="email"
                {...register('email', { required: true })}
                className="w-full p-2 border rounded"
              />
              {errors.email && <span className="text-red-500 text-sm">{t('formErrorRequired')}</span>}
            </div>
            <div className="mb-4">
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">{t('phoneNumber')}</label>
              <input
                type="tel"
                id="phoneNumber"
                {...register('phoneNumber', { required: true })}
                className="w-full p-2 border rounded"
              />
              {errors.phoneNumber && <span className="text-red-500 text-sm">{t('formErrorRequired')}</span>}
            </div>
            <button type="submit" disabled={loading}   className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              {loading ? t('processing') : t('profileUpdateSuccess')} {/* Assuming 'profileUpdateSuccess' can be reused for button or add 'updateProfileButton' */}
            </button>
          </form>
        ) : (
          <div className="text-center">
            <p className="text-red-500">{t('profileErrorLoadUser')}</p>
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {t('profileButtonBackToLogin')}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}