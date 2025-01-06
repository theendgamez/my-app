"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Navbar from '@/components/navbar/Navbar'; // Ensure correct path casing
import Sidebar from "@/components/Sidebar";
import type { Zone } from '@/types';

interface FormData {
  eventName: string;
  eventDate: string;
  description: string;
  location: string;
  isDrawMode: boolean;
  // Draw mode fields
  registerDate?: string;
  endregisterDate?: string;
  drawDate?: string;
  // Direct sale field
  onSaleDate?: string;
  // Common fields
  zones: Zone[];
  photo: FileList;
  status?: 'Prepare' | 'OnSale' | 'SoldOut';
  category?: string; // Ensure this matches the Events interface
}

const CreateEventPage = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [isDrawMode, setIsDrawMode] = useState(false);

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      zones: [],
      status: 'Prepare'
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "zones"
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError('');

    try {
      const formData = new FormData();

      // Common fields
      formData.append("name", data.eventName);
      formData.append("date", data.eventDate);
      formData.append("description", data.description);
      formData.append("location", data.location);
      formData.append("isDrawMode", data.isDrawMode ? "true" : "false");

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

      const response = await fetch("/api/cre-events", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        router.push('/events');
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

  return (
    <div>
      <Navbar />
      <Sidebar />
      {/* A4 size container */}
      <div className="container mx-auto p-8">
        <div className="max-w-[210mm] mx-auto bg-white shadow-lg p-[20mm] min-h-[297mm] print:shadow-none">
          <h1 className="text-2xl font-bold mb-6">創建新活動</h1>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

            {/* Draw Mode */}
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-2">是否抽籤 ?</label>
              <button
                type="button"
                onClick={() => setIsDrawMode(!isDrawMode)}
                className={`px-4 py-2 rounded-md ${isDrawMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
                  }`}
              >
                {isDrawMode ? 'Draw Mode' : 'Direct Sale'}
              </button>
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

            {/* Zone Fields */}
            <div className="form-group">
              {fields.map((field, index) => (
                <div key={field.id} style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                  <input className="block text-sm font-medium text-gray-700 mb-2"
                    {...register(`zones.${index}.name`, { required: "Zone name is required" })}
                    placeholder="Zone Name"
                  />
                   <input className="block text-sm font-medium text-gray-700 mb-2"
                    {...register(`zones.${index}.max`, { required: "Total Tickets is required" })}
                    placeholder="Total Tickets"
                  />
                  <input className="block text-sm font-medium text-gray-700 mb-2"
                    {...register(`zones.${index}.remaining`, { required: "Total Tickets is required" })}
                    placeholder="Total Tickets"
                  />
                  <button className="block text-sm font-medium text-gray-700 mb-2" type="button" onClick={() => remove(index)}>
                    Remove
                  </button>
                </div>
              ))}
              <button className="block text-sm font-medium text-gray-700 mb-2" type="button" onClick={() => append({ name: "", price: "", remaining: "" , max: "" })}>
                Add Zone
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

            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full ${isSubmitting
                ? "bg-gray-400"
                : "bg-blue-500 hover:bg-blue-600"
                } text-white py-2 px-4 rounded-md transition-colors`}
              >
              {isSubmitting ? "創建中..." : "創建活動"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateEventPage;
