"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import Navbar from "@/components/navbar/Navbar";
import { useState } from "react";

interface FormData {
  userName: string;
  realName: string;
  email: string;
  phoneNumber: string;
  password: string;
}

export default function SignupClient() {
  const { register, handleSubmit, setError, formState: { errors } } = useForm<FormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        router.push(`/verify-email`);
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
      setIsSubmitting(false);
    }
  };

  const phoneValidationPattern = /^\+?[1-9]\d{1,14}$/;

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
              <label htmlFor="userName" className="block text-sm/6 font-medium text-gray-900">用戶名稱</label>
              <div className="mt-2">
                <input
                  id="userName"
                  type="text"
                  autoComplete="username"
                  {...register("userName", { required: "請輸入用戶名稱" })}
                  className="border border-black block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                />
                {errors.userName && <p className="text-red-500 text-sm mb-3">{errors.userName.message}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="realName" className="block text-sm/6 font-medium text-gray-900">真實姓名</label>
              <div className="mt-2">
                <input
                  id="realName"
                  type="text"
                  autoComplete="name"
                  {...register("realName", { required: "請輸入真實姓名" })}
                  className="border border-black block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                />
                {errors.realName && <p className="text-red-500 text-sm mb-3">{errors.realName.message}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm/6 font-medium text-gray-900">電子郵件</label>
              <div className="mt-2">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register("email", { required: "請輸入電子郵件" })}
                  className="border border-black block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                />
                {errors.email && <p className="text-red-500 text-sm mb-3">{errors.email.message}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm/6 font-medium text-gray-900">電話號碼</label>
              <div className="mt-2">
                <input
                  id="phoneNumber"
                  type="tel"
                  autoComplete="tel"
                  {...register("phoneNumber", {
                    required: "請輸入電話號碼",
                    pattern: {
                      value: phoneValidationPattern,
                      message: "請輸入有效的電話號碼",
                    },
                  })}
                  className="border border-black block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                />
                {errors.phoneNumber && <p className="text-red-500 text-sm mb-3">{errors.phoneNumber.message}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm/6 font-medium text-gray-900">密碼</label>
              <div className="mt-2">
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  {...register("password", { required: "請輸入密碼" })}
                  className="border border-black block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                />
                {errors.password && <p className="text-red-500 text-sm mb-3">{errors.password.message}</p>}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex w-full justify-center rounded-md px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs ${
                  isSubmitting ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                }`}
              >
                {isSubmitting ? "註冊中..." : "註冊"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
