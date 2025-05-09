"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import Navbar from "@/components/navbar/Navbar";
import { useState } from "react";
import authEvents from "@/utils/authEvents";
import { useAuth } from "@/context/AuthContext";

interface FormData {
  userName: string;
  realName: string;
  email: string;
  phoneNumber: string;
  password: string;
}

export default function SignUpPage() {
  const { register, handleSubmit, setError, formState: { errors } } = useForm<FormData>();
  const [isSubmitting, setIsSubmitting] = useState(false); // 加載狀態
  const router = useRouter();
  const { refreshAuthState } = useAuth();

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true); // 設置加載狀態
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store authentication info
        if (data.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('userId', data.user.userId);
          
          // Trigger auth state refresh
          await refreshAuthState();
          
          // Emit auth event for other components
          authEvents.emit();
          
          // Redirect to home page after a brief delay
          setTimeout(() => {
            router.push('/');
          }, 1000);
        } else {
          // If email verification is required
          router.push(`/verify-email`);
        }
      } else {
        const errorData = await response.json();
        if (errorData.error === "該電子郵件已被註冊。") {
          setError("email", { type: "server", message: errorData.error });
        } else {
          alert(`註冊失敗：${errorData.error}`);
        }
      }
    } catch (error) {
      console.error("Registration error:", error);
      alert("註冊失敗：發生了一個錯誤。");
    } finally {
      setIsSubmitting(false); // 重置加載狀態
    }
  };

  const phoneValidationPattern = /^\+?[1-9]\d{1,14}$/; // E.164 標準

  return (
    <>
      <Navbar />
      <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-gray-900">註冊</h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm/6 font-medium text-gray-900">用戶名稱</label>
              <div className="mt-2">
                <input
                  type="text"
                  placeholder="用戶名稱"
                  {...register("userName", { required: "用戶名稱是必填的。", maxLength: 20 })}
                  className="border border-black block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                />
                {errors.userName && <p className="text-red-500 text-sm mb-3">{errors.userName.message}</p>}
              </div>
            </div>

            <div>
            <label className="block text-sm/6 font-medium text-gray-900">真實姓名</label>
            <div className="mt-2">
              <input
                type="text"
                placeholder="真實姓名"
                {...register("realName", { required: "真實姓名是必填的。" })}
                className="border border-black block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
              />
              {errors.realName && <p className="text-red-500 text-sm mb-3">{errors.realName.message}</p>}
            </div>
          </div>

            <div>
              <label className="block text-sm/6 font-medium text-gray-900">電子郵件</label>
              <div className="mt-2">
                <input
                  type="email"
                  placeholder="電子郵件"
                  {...register("email", {
                    required: "電子郵件是必填的。",
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: "電子郵件格式不正確。",
                    },
                  })}
                  className="border border-black block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                />
                {errors.email && <p className="text-red-500 text-sm mb-3">{errors.email.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm/6 font-medium text-gray-900">電話號碼</label>
              <div className="mt-2">
                <input
                  type="text"
                  placeholder="電話號碼"
                  {...register("phoneNumber", {
                    required: "電話號碼是必填的。",
                    pattern: {
                      value: phoneValidationPattern,
                      message: "電話號碼格式不正確，請輸入有效的號碼。",
                    },
                  })}
                  className="border border-black block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                />
                {errors.phoneNumber && <p className="text-red-500 text-sm mb-3">{errors.phoneNumber.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm/6 font-medium text-gray-900">密碼</label>
              <div className="mt-2">
                <input
                  type="password"
                  placeholder="密碼"
                  {...register("password", {
                    required: "密碼是必填的。",
                    minLength: { value: 6, message: "密碼至少需要6個字符。" },
                    validate: {
                      hasUpperCase: value => /[A-Z]/.test(value) || "密碼必須包含至少一個大寫字母。",
                      hasLowerCase: value => /[a-z]/.test(value) || "密碼必須包含至少一個小寫字母。",
                    },
                  })}
                  className="border border-black block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                />
                {errors.password && <p className="text-red-500 text-sm mb-3">{errors.password.message}</p>}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex w-full justify-center rounded-md px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                  isSubmitting ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-500"
                }`}
              >
                {isSubmitting ? "提交中..." : "註冊"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
