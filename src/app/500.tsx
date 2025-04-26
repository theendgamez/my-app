import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function Custom500() {
  return (
    <>
      <Head>
        <title>500 - 伺服器錯誤</title>
      </Head>
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">伺服器錯誤</h1>
          <p className="text-gray-600 mb-6">
            很抱歉，伺服器發生了問題。請稍後重試或聯絡管理員。

          <Link href="/" className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          <></>
            返回首頁
          </Link>
          </p>
        </div>
      </div>
    </>
  );
}
