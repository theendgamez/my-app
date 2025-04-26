import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-4xl font-bold mb-4 text-blue-700">404 - 找不到頁面</h1>
      <p className="mb-6 text-gray-600">您所尋找的頁面不存在。</p>
      <Link href="/">
        <a className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          返回首頁
        </a>
      </Link>
    </div>
  );
}
