// src/app/signup/page.tsx
"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navber";

interface FormData {
  userName: string;
  email: string;
  phoneNumber: string;
  password: string;
}

export default function SignUpPage() {
  const { register, handleSubmit, setError, formState: { errors } } = useForm<FormData>();
  const router = useRouter();

  const onSubmit = async (data: FormData) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const responseData = await response.json();
        alert(`註冊成功！您的用戶 ID 是：${responseData.userId}`);
        router.push("/login");
      } else {
        const errorData = await response.json();
        // Handle specific server-side validation errors
        if (errorData.error === '該電子郵件已被註冊。') {
          setError('email', { type: 'server', message: errorData.error });
        } else {
          alert(`註冊失敗：${errorData.error}`);
        }
      }
    } catch (error) {
      console.error("Registration error:", error);
      alert("註冊失敗：發生了一個錯誤。");
    }
  };

  return (
    <>
      <Navbar />
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="max-w-md w-full border border-black rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-4 text-center text-blue-500">註冊</h1>
          <form onSubmit={handleSubmit(onSubmit)}>
            <input
              type="text"
              placeholder="用戶名稱"
              {...register("userName", { required: "用戶名稱是必填的。", maxLength: 20,minLength:1 })}
              className="border border-black p-2 w-full mb-1 rounded"
            />
            {errors.userName && <p className="text-red-500 text-sm mb-3">{errors.userName.message}</p>}

            <input
              type="email"
              placeholder="電子郵件"
              {...register("email", {
                required: "電子郵件是必填的。",
                maxLength: 25,
                pattern: {
                  value: /^\S+@\S+$/i,
                  message: "電子郵件格式不正確。",
                }
              })}
              className="border border-black p-2 w-full mb-1 rounded"
            />
            {errors.email && <p className="text-red-500 text-sm mb-3">{errors.email.message}</p>}

            <input
              type="text"
              placeholder="電話號碼"
              {...register("phoneNumber", { required: "電話號碼是必填的。" })}
              className="border border-black p-2 w-full mb-1 rounded"
            />
            {errors.phoneNumber && <p className="text-red-500 text-sm mb-3">{errors.phoneNumber.message}</p>}

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
              className="border border-black p-2 w-full mb-1 rounded"
            />
            {errors.password && <p className="text-red-500 text-sm mb-3">{errors.password.message}</p>}

            <button
              type="submit"
              className="bg-blue-500 text-white p-2 rounded w-full border border-black"
            >
              註冊
            </button>
          </form>
        </div>
      </div>
    </>
  );
}