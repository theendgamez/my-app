"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/navbar/Navbar';
import Sidebar from "@/components/admin/Sidebar";
import { useAuth } from '@/context/AuthContext';
import type { Zone, Events } from '@/types';
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
  status?: 'Prepare' | 'OnSale' | 'SoldOut';
  category?: string;
}

export default function EditEventPage() {
  const router = useRouter();
  const { id } = useParams();
  const { user, isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [, setEvent] = useState<Events | null>(null);
  
  // Form setup
  const { register, handleSubmit, control, setValue, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      zones: [],
      status: 'Prepare',
      isDrawMode: false
    }
  });

  // Memoize fetchEventData to use it in the dependency array
  const fetchEventData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/events/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch event data');
      }
      
      const eventData = await response.json();
      setEvent(eventData);
      
      // Prepare dates for form input (YYYY-MM-DDTHH:mm)
      const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toISOString().slice(0, 16);
      };
      
      // Populate form with event data
      reset({
        eventName: eventData.eventName,
        eventDate: formatDate(eventData.eventDate),
        description: eventData.description,
        location: eventData.location,
        isDrawMode: eventData.isDrawMode,
        registerDate: formatDate(eventData.registerDate),
        endregisterDate: formatDate(eventData.endregisterDate),
        drawDate: formatDate(eventData.drawDate),
        onSaleDate: formatDate(eventData.onSaleDate),
        status: eventData.status || 'Prepare',
        category: eventData.category,
        zones: eventData.zones || []
      });
      
      // Update isDrawMode state for UI
      setIsDrawMode(eventData.isDrawMode);
      
    } catch (error) {
      console.error('Error fetching event:', error);
      setError('無法獲取活動資料');
    } finally {
      setIsLoading(false);
    }
  }, [id, reset]);

  // Check if user is admin, redirect if not
  useEffect(() => {
    if (!authLoading && isAuthenticated && !isAdmin) {
      router.push('/');
    }
    
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/admin/events/edit/' + id);
    }
  }, [authLoading, isAuthenticated, isAdmin, router, id]);

  // Fetch event data
  useEffect(() => {
    if (id && !authLoading && isAdmin) {
      fetchEventData();
    }
  }, [id, authLoading, isAdmin, fetchEventData]);

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
      const response = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
          'x-user-id': user?.userId || '',
        },
        body: JSON.stringify({
          eventName: data.eventName,
          eventDate: data.eventDate,
          description: data.description,
          location: data.location,
          isDrawMode: isDrawMode,
          registerDate: isDrawMode ? data.registerDate : undefined,
          endregisterDate: isDrawMode ? data.endregisterDate : undefined,
          drawDate: isDrawMode ? data.drawDate : undefined,
          onSaleDate: !isDrawMode ? data.onSaleDate : undefined,
          status: data.status,
          category: data.category,
          zones: data.zones
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setSuccess('活動更新成功！');
        // Redirect after delay
        setTimeout(() => {
          router.push('/admin/events');
        }, 2000);
      } else {
        setError(result.error || '更新活動失敗');
      }
    } catch (error) {
      console.error("Error updating event:", error);
      setError('發生錯誤，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Prevent flash of content before redirect
  }

  return (
    <div>
      <Navbar />
      <div className="flex">
        <Sidebar />
        <div className="container mx-auto p-8 ml-64">
          <div className="max-w-[210mm] mx-auto bg-white shadow-lg p-[20mm] min-h-[297mm] print:shadow-none">
            <h1 className="text-2xl font-bold mb-6">編輯活動</h1>
            
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

              {/* Event Status */}
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-2">活動狀態:</label>
                <select
                  {...register("status")}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="Prepare">準備中</option>
                  <option value="OnSale">售票中</option>
                  <option value="SoldOut">售罄</option>
                </select>
              </div>

              {/* Draw Mode (disabled in edit mode) */}
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-2">售票模式:</label>
                <div className="flex space-x-4">
                  <div className={`px-4 py-2 rounded-md ${!isDrawMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                    }`}>
                    直接售票
                  </div>
                  <div className={`px-4 py-2 rounded-md ${isDrawMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                    }`}>
                    抽籤模式
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  售票模式無法在編輯時更改
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
                  {isSubmitting ? "更新中..." : "更新活動"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
