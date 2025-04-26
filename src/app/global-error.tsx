"use client";

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="zh-HK">
      <body>
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">系統錯誤</h1>
            <p className="text-gray-600 mb-6">
              很抱歉，出現了嚴重的系統錯誤。請重試或聯繫管理員。
            </p>
            <button
              onClick={reset}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-6 py-3 rounded transition duration-200"
            >
              重試
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
