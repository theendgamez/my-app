"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/utils/fetchWithAuth';
import { Events } from '@/types';
import { FaArrowLeft, FaSearch, FaDownload } from 'react-icons/fa';

type LotteryResult = {
  registrationToken: string;
  userId: string;
  userName?: string;
  email?: string;
  phoneNumber?: string;
  result: 'won' | 'lost';
  zoneName: string;
  quantity: number;
  createdAt?: string;
};

export default function LotteryResultsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.id as string;
  
  const [event, setEvent] = useState<Events | null>(null);
  const [results, setResults] = useState<LotteryResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!eventId) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch event details
        const eventResponse = await fetchWithAuth(`/api/events/${eventId}`);
        if (!eventResponse.ok) {
          throw new Error('Failed to fetch event details');
        }
        const eventData = await eventResponse.json();
        setEvent(eventData);
        
        // Fetch lottery results
        const resultsResponse = await fetchWithAuth(`/api/lottery/${eventId}/results`);
        if (!resultsResponse.ok) {
          throw new Error('Failed to fetch lottery results');
        }
        const resultsData = await resultsResponse.json();
        setResults(resultsData.results);
      } catch (err) {
        setError('Failed to load lottery results');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [eventId]);

  const exportCsv = () => {
    if (!results.length) return;
    
    // Prepare CSV content
    const headers = ['User ID', 'User Name', 'Email', 'Phone', 'Result', 'Zone', 'Quantity', 'Registration Date'];
    const csvRows = [
      headers.join(','),
      ...results.map(r => [
        r.userId,
        r.userName || '',
        r.email || '',
        r.phoneNumber || '',
        r.result,
        r.zoneName,
        r.quantity,
        r.createdAt || ''
      ].map(value => `"${value}"`).join(','))
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `lottery-results-${eventId}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredResults = results
    .filter(result => {
      const searchFields = [
        result.userId,
        result.userName?.toLowerCase(),
        result.email?.toLowerCase(),
        result.phoneNumber?.toLowerCase()
      ].filter(Boolean);
      
      return searchTerm === '' || searchFields.some(field => field?.includes(searchTerm.toLowerCase()));
    })
    .filter(result => {
      if (filter === 'all') return true;
      if (filter === 'winners' && result.result === 'won') return true;
      if (filter === 'losers' && result.result === 'lost') return true;
      return false;
    });

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="bg-white p-6 rounded-lg shadow-md mb-6 h-16"></div>
        <div className="bg-white p-6 rounded-lg shadow-md h-96"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="text-center py-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">活動未找到</h2>
          <button 
            onClick={() => router.back()}
            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <FaArrowLeft className="mr-2" /> 返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => router.back()}
            className="inline-flex items-center p-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-2xl font-bold">{event.eventName} - 抽籤結果</h1>
        </div>
        <button 
          onClick={exportCsv}
          disabled={!results.length}
          className={`inline-flex items-center px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 ${!results.length ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <FaDownload className="mr-2" /> 導出CSV
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500 mb-1">總參與者</h3>
            <p className="text-2xl font-bold">{results.length}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="text-sm font-medium text-green-600 mb-1">得獎者</h3>
            <p className="text-2xl font-bold text-green-700">
              {results.filter(r => r.result === 'won').length}
            </p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <h3 className="text-sm font-medium text-red-600 mb-1">未中獎者</h3>
            <p className="text-2xl font-bold text-red-700">
              {results.filter(r => r.result === 'lost').length}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="relative flex-1 min-w-[300px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="搜尋用戶..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex space-x-2">
            <select
              className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            >
              <option value="all">全部結果</option>
              <option value="winners">得獎者</option>
              <option value="losers">未中獎</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用戶
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  聯絡資料
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  區域
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  數量
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  結果
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredResults.map(result => (
                <tr key={result.registrationToken}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{result.userName || '未知用戶'}</div>
                    <div className="text-xs text-gray-500">{result.userId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{result.email || '未知電郵'}</div>
                    <div className="text-sm text-gray-500">{result.phoneNumber || '未知電話'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{result.zoneName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{result.quantity}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${result.result === 'won' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {result.result === 'won' ? '中獎' : '未中獎'}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredResults.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    沒有符合條件的抽籤結果
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
