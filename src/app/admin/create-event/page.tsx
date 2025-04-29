"use client";


import { useForm, useFieldArray } from "react-hook-form";
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface FormData {
  eventName: string;
  description: string;
  eventDate: string;
  location: string;
  photo: FileList;
  status: string;
  isDrawMode: boolean;
  onSaleDate?: string;
  drawDate?: string;
  zones: {
    name: string;
    price: string;
    zoneQuantity: number;
    max: string;
  }[];
}

export default function CreateEventPage() {
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
      formData.append('eventName', data.eventName);
      formData.append('description', data.description);
      formData.append('eventDate', data.eventDate);
      formData.append('location', data.location);
      formData.append('status', data.status);
      formData.append('isDrawMode', String(data.isDrawMode));

      // Only append draw date if in draw mode
      if (data.isDrawMode && data.drawDate) {
        formData.append('drawDate', data.drawDate);
      } else if (!data.isDrawMode && data.onSaleDate) {
        formData.append('onSaleDate', data.onSaleDate);
      }

      // Append zones
      if (data.zones.length > 0) {
        formData.append('zones', JSON.stringify(data.zones));
      }

      // Append photo if it exists
      if (data.photo && data.photo.length > 0) {
        formData.append('photo', data.photo[0]);
      }

      const response = await fetch('/api/events/create', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create event');
      }

      router.push('/admin/events');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'An error occurred while creating the event');
      } else {
        setError('An error occurred while creating the event');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center p-4">
      <div className="w-[210mm] min-h-[297mm] p-6 bg-white rounded shadow-md mx-auto my-4 print:shadow-none print:p-0">
        <h1 className="text-2xl font-bold mb-6">建立新活動</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Event Name */}
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">活動名稱:</label>
            <input
              {...register("eventName", {
                required: "活動名稱是必填的",
                minLength: { value: 2, message: "名稱至少需要2個字符" }
              })}
              className="w-full p-2 border rounded-md"
            />
            {errors.eventName && <p className="text-red-500 text-sm mt-1">{errors.eventName.message}</p>}
          </div>

          {/* Location */}
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-2">活動地點:</label>
            <input
              {...register("location", { required: "活動地點是必填的" })}
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
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
          </div>

          {/* Draw Mode Toggle */}
          <div className="form-group">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                {...register("isDrawMode")}
                onChange={(e) => setIsDrawMode(e.target.checked)}
                className="form-checkbox h-5 w-5 text-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">啟用抽籤模式</span>
            </label>
          </div>

          {/* Conditional Fields based on Draw Mode */}
          {isDrawMode ? (
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-2">抽籤日期:</label>
              <input
                {...register("drawDate", { required: isDrawMode ? "抽籤日期是必填的" : false })}
                type="datetime-local"
                className="w-full p-2 border rounded-md"
              />
              {errors.drawDate && <p className="text-red-500 text-sm mt-1">{errors.drawDate.message}</p>}
            </div>
          ) : (
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-2">開售日期:</label>
              <input
                {...register("onSaleDate", { required: !isDrawMode ? "開售日期是必填的" : false })}
                type="datetime-local"
                className="w-full p-2 border rounded-md"
              />
              {errors.onSaleDate && <p className="text-red-500 text-sm mt-1">{errors.onSaleDate.message}</p>}
            </div>
          )}

          {/* Zone Fields */}
          <div className="form-group space-y-4">
            <h3 className="text-lg font-medium text-gray-800">票區設定</h3>
            {fields.map((field, index) => (
              <div key={field.id} className="flex flex-wrap gap-2 items-center p-3 border rounded-md bg-gray-50">
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs text-gray-500 mb-1">票區名稱</label>
                  <input
                    {...register(`zones.${index}.name`, { required: "票區名稱是必填的" })}
                    placeholder="票區名稱"
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-xs text-gray-500 mb-1">單人最多票數</label>
                  <input
                    {...register(`zones.${index}.max`, { required: "最多票數是必填的" })}
                    placeholder="單人最多票數"  
                    className="w-full p-2 border rounded-md"
                    type="number"
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-xs text-gray-500 mb-1">總票數</label>
                  <input
                    {...register(`zones.${index}.zoneQuantity`, { required: "總票數是必填的" })}
                    placeholder="總票數"
                    className="w-full p-2 border rounded-md"
                    type="number"
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-xs text-gray-500 mb-1">價格</label>
                  <input
                    {...register(`zones.${index}.price`, { required: "價格是必填的" })}
                    placeholder="價格"
                    className="w-full p-2 border rounded-md"
                    type="number"
                  />
                </div>
                <div className="flex items-end pt-4 ml-auto">
                  <button 
                    type="button" 
                    onClick={() => remove(index)}
                    className="bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded-md text-sm"
                  >
                    移除
                  </button>
                </div>
              </div>
            ))}
            <button 
              type="button" 
              onClick={() => append({ name: "", price: "", zoneQuantity: 0, max: "" })}
              className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md text-sm font-medium"
            >
              新增票區
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
              } text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline`}
          >
            {isSubmitting ? "提交中..." : "建立活動"}
          </button>
        </form>
      </div>
    </div>
  );
}
