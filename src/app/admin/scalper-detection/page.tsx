'use client';

import { useState } from 'react';
import AdminPage from '@/components/admin/AdminPage';
import { useScalperDetection } from '@/hooks/useScalperDetection';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function ScalperDetectionPage() {
  const { detectScalper, prediction, loading, error } = useScalperDetection();
  const [formData, setFormData] = useState({
    domain_frequency: 0,
    is_mainstream: 0,
    domain_length: 0,
    is_suspicious: 0,
    is_temporary: 0,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: parseInt(value) || 0
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await detectScalper(formData);
  };

  const getScalperRiskLevel = () => {
    if (!prediction) return null;
    
    const probability = prediction.probability;
    if (probability > 0.8) return { level: 'very-high', text: '極高風險', color: 'bg-red-100 text-red-800' };
    if (probability > 0.6) return { level: 'high', text: '高風險', color: 'bg-orange-100 text-orange-800' };
    if (probability > 0.4) return { level: 'medium', text: '中等風險', color: 'bg-yellow-100 text-yellow-800' };
    return { level: 'low', text: '低風險', color: 'bg-green-100 text-green-800' };
  };

  const riskInfo = getScalperRiskLevel();

  return (
    <AdminPage title="黃牛檢測系統" isLoading={false}>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">用戶風險評估</h2>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                域名頻率 (Domain Frequency)
              </label>
              <input
                type="number"
                name="domain_frequency"
                value={formData.domain_frequency}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                min="0"
                max="100"
              />
              <p className="text-xs text-gray-500 mt-1">該電子郵件域名在系統中出現的次數</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                主流域名 (Is Mainstream)
              </label>
              <div className="flex items-center">
                <input
                  type="range"
                  name="is_mainstream"
                  value={formData.is_mainstream}
                  onChange={handleChange}
                  className="w-full"
                  min="0"
                  max="1"
                  step="1"
                />
                <span className="ml-2 w-8 text-center">
                  {formData.is_mainstream ? '是' : '否'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">是否為常見電子郵件服務商（如gmail、outlook等）</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                域名長度 (Domain Length)
              </label>
              <input
                type="number"
                name="domain_length"
                value={formData.domain_length}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                min="0"
                max="100"
              />
              <p className="text-xs text-gray-500 mt-1">域名的字符長度</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                可疑域名 (Is Suspicious)
              </label>
              <div className="flex items-center">
                <input
                  type="range"
                  name="is_suspicious"
                  value={formData.is_suspicious}
                  onChange={handleChange}
                  className="w-full"
                  min="0"
                  max="1"
                  step="1"
                />
                <span className="ml-2 w-8 text-center">
                  {formData.is_suspicious ? '是' : '否'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">域名是否包含可疑關鍵字或模式</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                臨時郵箱 (Is Temporary)
              </label>
              <div className="flex items-center">
                <input
                  type="range"
                  name="is_temporary"
                  value={formData.is_temporary}
                  onChange={handleChange}
                  className="w-full"
                  min="0"
                  max="1"
                  step="1"
                />
                <span className="ml-2 w-8 text-center">
                  {formData.is_temporary ? '是' : '否'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">是否使用臨時電子郵件服務</p>
            </div>
          </div>
          
          <button 
            type="submit"
            disabled={loading}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {loading ? '分析中...' : '分析風險'}
          </button>
        </form>
        
        {loading && (
          <div className="flex justify-center my-8">
            <LoadingSpinner size="medium" />
          </div>
        )}
        
        {prediction && !loading && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4">分析結果</h3>
            
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">風險評級:</p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${riskInfo?.color}`}>
                  {riskInfo?.text}
                </span>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">黃牛可能性:</p>
                <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${prediction.is_scalper ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${prediction.probability * 100}%` }}
                  ></div>
                </div>
                <p className="text-right mt-1 text-sm">
                  {Math.round(prediction.probability * 100)}%
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 mb-1">AI判定:</p>
                <p className="font-medium">
                  {prediction.is_scalper 
                    ? '⚠️ 此用戶很可能是黃牛' 
                    : '✅ 此用戶可能是正常用戶'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminPage>
  );
}
