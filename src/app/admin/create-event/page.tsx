"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Navbar from '@/components/navbar/Navbar';
import Sidebar from "@/components/admin/Sidebar";
import { useAuth } from '@/context/AuthContext';
import type { Zone } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface FormData {
  eventName: string;
  eventDate: string;
  description: string;
  location: string;
  isDrawMode: boolean;
  registerDate?: string;
  endregisterDate?: string;
  drawDate?: string;
  onSaleDate?: string;
  zones: Zone[];
  photo: FileList;
  status?: 'Prepare' | 'OnSale' | 'SoldOut';
  category?: string; // Ensure this matches the Events interface
}

const CreateEventPage = () => {
  const router = useRouter();
  const { user, isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isDrawMode, setIsDrawMode] = useState(false);

  // Update the authentication check effect
  useEffect(() => {
    // Skip effect during server-side rendering
    if (typeof window === 'undefined') return;
    
    // If still loading auth state, don't do anything yet
    if (authLoading) return;
    
    // Prevent redirect loops by checking if we've just been redirected
    const lastLoginRedirectTime = parseInt(localStorage.getItem('last_redirect_time') || '0');
    const now = Date.now();
    
    // If we were just redirected to login within the last 3 seconds, don't redirect again
    const recentlyRedirected = now - lastLoginRedirectTime < 3000;
    
    if (!isAuthenticated && !recentlyRedirected) {
      // Mark redirection time to prevent loops
      localStorage.setItem('last_redirect_time', now.toString());
      localStorage.setItem('redirected_to_login', 'true');
      
      // Not logged in, redirect to login with intended destination
      const encodedRedirect = encodeURIComponent('/admin/create-event');
      router.push(`/login?redirect=${encodedRedirect}`);
      return;
    }
    
    // If authenticated but not admin, redirect to home
    if (isAuthenticated && !isAdmin) {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, isAdmin, router]);

  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      zones: [],
      status: 'Prepare',
      isDrawMode: false
    }
  });

  // Update the form value when isDrawMode changes
  useEffect(() => {
    setValue('isDrawMode', isDrawMode);
  }, [isDrawMode, setValue]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "zones"
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();

      // Common fields
      formData.append("name", data.eventName);
      formData.append("date", data.eventDate);
      formData.append("description", data.description);
      formData.append("location", data.location);
      formData.append("isDrawMode", isDrawMode ? "true" : "false");

      // Mode-specific dates
      if (data.isDrawMode) {
        if (data.registerDate) formData.append("registerDate", data.registerDate);
        if (data.endregisterDate) formData.append("endregisterDate", data.endregisterDate);
        if (data.drawDate) formData.append("drawDate", data.drawDate);
      } else {
        if (data.onSaleDate) formData.append("onSaleDate", data.onSaleDate);
      }

      // Zones and photo
      formData.append("zones", JSON.stringify(data.zones));
      if (data.photo?.[0]) {
        formData.append("photo", data.photo[0]);
      }

      // Added category field
      formData.append("category", data.category || "default");

      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
          'x-user-id': user?.userId || '',
        },
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        setSuccess('活動創建成功！');
        // Redirect to event list after a brief delay
        setTimeout(() => {
          router.push('/admin/events');
        }, 2000);
      } else {
        setError(result.error || '創建活動失敗');
      }
    } catch (error) {
      console.error("Error creating event:", error);
      setError('發生錯誤，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!isAdmin) {
    return null; // This will prevent flash of content before redirect
  }

  return (
    <div>
      <Navbar />
      <div className="flex">
        <Sidebar isOpen={false} toggleSidebar={function (): void {
          throw new Error("Function not implemented.");
        } } isMobile={false} />
        <div className="container mx-auto p-8 ml-64">
          <div className="max-w-[210mm] mx-auto bg-white shadow-lg p-[20mm] min-h-[297mm] print:shadow-none">
            <h1 className="text-2xl font-bold mb-6">創建新活動</h1>
            
            {success && (
              <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                {success}
              </div>
            )}
            
            {error && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Hidden field for isDrawMode */}
              <input type="hidden" {...register("isDrawMode")} />
              
              {/* Event Name */}
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-2">活動名稱:</label>
                <input
                  {...register("eventName", { required: "活動名稱是必填的" })}
                  type="text"
                  className="w-full p-2 border rounded-md"
                />
                {errors.eventName && <p className="text-red-500 text-sm mt-1">{errors.eventName.message}</p>}
              </div>

              {/* Location */}
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-2">地點:</label>
                <input
                  {...register("location", { required: "地點是必填的" })}
                  type="text"
                  className="w-full p-2 border rounded-md"
                />
                {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location.message}</p>}
              </div>

              {/* Event Date */}
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-2">活動日期:</label>
                <input
                  {...register("eventDate", { required: "活動日期是必填的" })}
                  type="datetime-local"
                  className="w-full p-2 border rounded-md"
                />
                {errors.eventDate && <p className="text-red-500 text-sm mt-1">{errors.eventDate.message}</p>}
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-2">活動描述:</label>
                <textarea
                  {...register("description", {
                    required: "活動描述是必填的",
                    minLength: { value: 20, message: "描述至少需要20個字符" },
                    maxLength: { value: 1000, message: "描述不能超過1000個字符" }
                  })}
                  rows={6}
                  className="w-full p-2 border rounded-md resize-y"
                  placeholder="請詳細描述活動內容、規則等信息..."
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                )}
              </div>

              {/* Category */}
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-2">活動類別:</label>
                <input
                  {...register("category")}
                  type="text"
                  className="w-full p-2 border rounded-md"
                />
              </div>

              {/* Draw Mode Button - Now clearer it's a toggle */}
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-2">售票模式:</label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setIsDrawMode(false)}
                    className={`px-4 py-2 rounded-md ${!isDrawMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                      }`}
                  >
                    直接售票
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDrawMode(true)}
                    className={`px-4 py-2 rounded-md ${isDrawMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                      }`}
                  >
                    抽籤模式
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {isDrawMode 
                    ? '抽籤模式：用戶需要先登記參與抽籤，中籤後才能購買門票。' 
                    : '直接售票：用戶可以直接購買門票，不需要抽籤。'}
                </p>
              </div>

              {/* Registration Period */}
              {isDrawMode ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-2">報名開始日期:</label>
                      <input
                        {...register("registerDate", { required: "報名開始日期是必填的" })}
                        type="datetime-local"
                        className="w-full p-2 border rounded-md"
                      />
                      {errors.registerDate && <p className="text-red-500 text-sm mt-1">{errors.registerDate.message}</p>}
                    </div>
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-2">報名結束日期:</label>
                      <input
                        {...register("endregisterDate", { required: "報名結束日期是必填的" })}
                        type="datetime-local"
                        className="w-full p-2 border rounded-md"
                      />
                      {errors.endregisterDate && <p className="text-red-500 text-sm mt-1">{errors.endregisterDate.message}</p>}
                    </div>
                  </div>

                  {/* Draw Date */}
                  <div className="form-group">
                    <label className="block text-sm font-medium text-gray-700 mb-2">抽籤日期:</label>
                    <input
                      {...register("drawDate", { required: "抽籤日期是必填的" })}
                      type="datetime-local"
                      className="w-full p-2 border rounded-md"
                    />
                    {errors.drawDate && <p className="text-red-500 text-sm mt-1">{errors.drawDate.message}</p>}
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-2">開售日期:</label>
                  <input
                    {...register("onSaleDate", { required: "開售日期是必填的" })}
                    type="datetime-local"
                    className="w-full p-2 border rounded-md"
                  />
                </div>
              )}

              {/* Zone Fields - Improved UI */}
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-2">區域設定:</label>
                {fields.length === 0 && (
                  <p className="text-sm text-gray-500 mb-2">尚未添加任何區域，請點擊下方按鈕添加區域。</p>
                )}
                {fields.map((field, index) => (
                  <div key={field.id} className="flex flex-wrap gap-2 p-3 mb-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="w-full md:w-auto flex-1">
                      <label className="text-xs text-gray-500">區域名稱</label>
                      <input
                        {...register(`zones.${index}.name`, { required: "區域名稱是必填的" })}
                        placeholder="如：A區、VIP區"
                        className="w-full p-2 border rounded-md"
                      />
                      {errors.zones?.[index]?.name && (
                        <p className="text-red-500 text-xs">{errors.zones[index].name?.message}</p>
                      )}
                    </div>
                    
                    <div className="w-full md:w-auto flex-1">
                      <label className="text-xs text-gray-500">票價</label>
                      <input
                        {...register(`zones.${index}.price`, { required: "票價是必填的" })}
                        placeholder="票價"
                        type="number"
                        className="w-full p-2 border rounded-md"
                      />
                      {errors.zones?.[index]?.price && (
                        <p className="text-red-500 text-xs">{errors.zones[index].price?.message}</p>
                      )}
                    </div>
                    
                    <div className="w-full md:w-auto flex-1">
                      <label className="text-xs text-gray-500">座位數量</label>
                      <input
                        {...register(`zones.${index}.zoneQuantity`, { 
                          required: "座位數量是必填的",
                          valueAsNumber: true 
                        })}
                        placeholder="座位數量"
                        type="number"
                        className="w-full p-2 border rounded-md"
                      />
                      {errors.zones?.[index]?.zoneQuantity && (
                        <p className="text-red-500 text-xs">{errors.zones[index].zoneQuantity?.message}</p>
                      )}
                    </div>
                    
                    <div className="w-full flex justify-end">
                      <button 
                        type="button" 
                        onClick={() => remove(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        移除區域
                      </button>
                    </div>
                  </div>
                ))}
                
                <button 
                  type="button" 
                  onClick={() => append({ name: "", price: "", zoneQuantity: 0, max: "" })}
                  className="mt-2 px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded"
                >
                  + 添加新區域
                </button>
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Photo:</label>
                <input
                  type="file"
                  accept="image/*"
                  {...register("photo", { required: "Photo is required" })}
                />
              </div>

              <div className="flex justify-end mt-8">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="mr-4 px-6 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-6 py-2 ${isSubmitting
                    ? "bg-gray-400"
                    : "bg-blue-500 hover:bg-blue-600"
                    } text-white rounded transition-colors`}
                >
                  {isSubmitting ? "創建中..." : "創建活動"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateEventPage;
