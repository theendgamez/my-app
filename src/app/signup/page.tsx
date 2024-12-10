// src/app/signup/page.tsx
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navber';

export default function SignUpPage() {
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const router = useRouter();


  const handleSignUp = async () => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName, email, password, phoneNumber}),
    });

    if (response.ok) {
      const data = await response.json();
      alert('註冊成功！您的用戶 ID 是：' + data.userId);
      router.push('/login');
    } else {
      const errorData = await response.json();
      alert('註冊失敗：' + errorData.error);
    }
  };

  return (
    <>
      <Navbar />
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="max-w-md w-full border border-black rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-4 text-center text-blue-500">註冊</h1>
          <input
            type="text"
            placeholder="用戶名稱"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="border border-black p-2 w-full mb-4 rounded"
          />
          <input
            type="email"
            placeholder="電子郵件"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-black p-2 w-full mb-4 rounded"
          />
          <input
            type="text"
            placeholder="電話號碼"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="border border-black p-2 w-full mb-4 rounded"
          />
          <input
            type="password"
            placeholder="密碼"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-black p-2 w-full mb-4 rounded"
          />
          <button
            onClick={handleSignUp}
            className="bg-blue-500 text-white p-2 rounded w-full border border-black"
          >
            註冊
          </button>
        </div>
      </div>
    </>
  );
}