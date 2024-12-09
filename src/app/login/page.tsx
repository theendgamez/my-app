// app/login/page.tsx
"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navber';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      // Handle successful login (e.g., store token, redirect)
      router.push('/'); // Redirect to the homepage
    } else {
      const errorData = await response.json();
      alert(`登入失敗，請檢查帳號和密碼。錯誤信息：${errorData.message}`);
    }
  };

  return (
    <>
      <Navbar />
      <div className="p-8 flex items-center justify-center min-h-screen border border-black rounded-lg">
        <div className="max-w-lg w-full border border-black rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-4 text-center text-blue-500">登入</h1>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            onClick={handleLogin}
            className="bg-blue-500 text-white p-2 rounded w-full border border-black"
          >
            登入
          </button>
        </div>
      </div>
    </>
  );
}