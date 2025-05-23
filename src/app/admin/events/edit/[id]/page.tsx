"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import AdminPage from '@/components/admin/AdminPage';
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
    <AdminPage title="編輯活動">
      <div className="container-responsive">
        <div className="max-w-4xl mx-auto">
          <div className="card p-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">編輯活動</h1>
              <button
                type="button"
                onClick={() => router.back()}
                className="btn-secondary"
              >
                返回列表
              </button>
            </div>
            
            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">{success}</p>
                  </div>
                </div>
              </div>
            )}
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Hidden field for isDrawMode */}
              <input type="hidden" {...register("isDrawMode")} />
              
              {/* Basic Information Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">基本資訊</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Event Name */}
                  <div className="form-group">
                    <label className="form-label">活動名稱 <span className="text-red-500">*</span></label>
                    <input
                      {...register("eventName", { required: "活動名稱是必填的" })}
                      type="text"
                      className="form-input"
                      placeholder="請輸入活動名稱"
                    />
                    {errors.eventName && <p className="form-error">{errors.eventName.message}</p>}
                  </div>

                  {/* Location */}
                  <div className="form-group">
                    <label className="form-label">活動地點 <span className="text-red-500">*</span></label>
                    <input
                      {...register("location", { required: "地點是必填的" })}
                      type="text"
                      className="form-input"
                      placeholder="請輸入活動地點"
                    />
                    {errors.location && <p className="form-error">{errors.location.message}</p>}
                  </div>

                  {/* Event Date */}
                  <div className="form-group">
                    <label className="form-label">活動日期 <span className="text-red-500">*</span></label>
                    <input
                      {...register("eventDate", { required: "活動日期是必填的" })}
                      type="datetime-local"
                      className="form-input"
                    />
                    {errors.eventDate && <p className="form-error">{errors.eventDate.message}</p>}
                  </div>

                  {/* Category */}
                  <div className="form-group">
                    <label className="form-label">活動類別</label>
                    <input
                      {...register("category")}
                      type="text"
                      className="form-input"
                      placeholder="請輸入活動類別"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="form-group mt-6">
                  <label className="form-label">活動描述 <span className="text-red-500">*</span></label>
                  <textarea
                    {...register("description", {
                      required: "活動描述是必填的",
                      minLength: { value: 20, message: "描述至少需要20個字符" },
                      maxLength: { value: 1000, message: "描述不能超過1000個字符" }
                    })}
                    rows={6}
                    className="form-textarea"
                    placeholder="請詳細描述活動內容..."
                  />
                  {errors.description && (
                    <p className="form-error">{errors.description.message}</p>
                  )}
                </div>

                {/* Event Status */}
                <div className="form-group">
                  <label className="form-label">活動狀態</label>
                  <select
                    {...register("status")}
                    className="form-select"
                  >
                    <option value="Prepare">準備中</option>
                    <option value="OnSale">售票中</option>
                    <option value="SoldOut">售罄</option>
                  </select>
                </div>
              </div>

              {/* Ticket Sales Mode Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">售票模式</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className={`
                    flex-1 p-4 rounded-lg border-2 text-center cursor-not-allowed
                    ${!isDrawMode
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-500'
                    }
                  `}>
                    <div className="font-medium">直接售票</div>
                    <div className="text-sm mt-1">立即開放購買</div>
                  </div>
                  <div className={`
                    flex-1 p-4 rounded-lg border-2 text-center cursor-not-allowed
                    ${isDrawMode
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-500'
                    }
                  `}>
                    <div className="font-medium">抽籤模式</div>
                    <div className="text-sm mt-1">報名後進行抽籤</div>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  <svg className="inline w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  售票模式無法在編輯時更改
                </p>
              </div>

              {/* Date Settings Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">日期設定</h3>
                {isDrawMode ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-group">
                      <label className="form-label">報名開始日期 <span className="text-red-500">*</span></label>
                      <input
                        {...register("registerDate", { required: "報名開始日期是必填的" })}
                        type="datetime-local"
                        className="form-input"
                      />
                      {errors.registerDate && <p className="form-error">{errors.registerDate.message}</p>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">報名結束日期 <span className="text-red-500">*</span></label>
                      <input
                        {...register("endregisterDate", { required: "報名結束日期是必填的" })}
                        type="datetime-local"
                        className="form-input"
                      />
                      {errors.endregisterDate && <p className="form-error">{errors.endregisterDate.message}</p>}
                    </div>
                    <div className="form-group md:col-span-2">
                      <label className="form-label">抽籤日期 <span className="text-red-500">*</span></label>
                      <input
                        {...register("drawDate", { required: "抽籤日期是必填的" })}
                        type="datetime-local"
                        className="form-input"
                      />
                      {errors.drawDate && <p className="form-error">{errors.drawDate.message}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">開售日期 <span className="text-red-500">*</span></label>
                    <input
                      {...register("onSaleDate", { required: "開售日期是必填的" })}
                      type="datetime-local"
                      className="form-input"
                    />
                  </div>
                )}
              </div>

              {/* Zone Settings Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">區域設定</h3>
                  <button 
                    type="button" 
                    onClick={() => append({ name: "", price: "", zoneQuantity: 0, max: "" })}
                    className="btn-primary"
                  >
                    + 添加區域
                  </button>
                </div>
                
                {fields.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.713-3.714M14 40v-4c0-1.313.253-2.566.713-3.714m0 0A9.971 9.971 0 0124 24c4.004 0 7.625 2.356 9.287 6.286" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="mt-2">尚未添加任何區域</p>
                    <p className="text-sm">請點擊上方按鈕添加票價區域</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="form-group">
                            <label className="form-label">區域名稱 <span className="text-red-500">*</span></label>
                            <input
                              {...register(`zones.${index}.name`, { required: "區域名稱是必填的" })}
                              placeholder="如：A區、VIP區"
                              className="form-input"
                            />
                            {errors.zones?.[index]?.name && (
                              <p className="form-error">{errors.zones[index].name?.message}</p>
                            )}
                          </div>
                          
                          <div className="form-group">
                            <label className="form-label">票價 (HKD$) <span className="text-red-500">*</span></label>
                            <input
                              {...register(`zones.${index}.price`, { required: "票價是必填的" })}
                              placeholder="1000"
                              type="number"
                              className="form-input"
                            />
                            {errors.zones?.[index]?.price && (
                              <p className="form-error">{errors.zones[index].price?.message}</p>
                            )}
                          </div>
                          
                          <div className="form-group">
                            <label className="form-label">座位數量 <span className="text-red-500">*</span></label>
                            <input
                              {...register(`zones.${index}.zoneQuantity`, { 
                                required: "座位數量是必填的",
                                valueAsNumber: true 
                              })}
                              placeholder="100"
                              type="number"
                              className="form-input"
                            />
                            {errors.zones?.[index]?.zoneQuantity && (
                              <p className="form-error">{errors.zones[index].zoneQuantity?.message}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex justify-end mt-4">
                          <button 
                            type="button" 
                            onClick={() => remove(index)}
                            className="btn-danger"
                          >
                            移除區域
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="btn-secondary order-2 sm:order-1"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary order-1 sm:order-2 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="small" color="white" />
                      更新中...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      更新活動
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AdminPage>
  );
}
