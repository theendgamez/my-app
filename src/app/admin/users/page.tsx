"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminPage from '@/components/admin/AdminPage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import {batchAnalyzeUsers } from '@/utils/mlService';
import { formatDate as formatDateUtil } from '@/utils/formatters'; // Import and alias

interface User {
  userId: string;
  userName?: string;
  email: string;
  role: string;
  createdAt?: string;
  phoneNumber?: string;
  status?: string;
  riskScore?: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'very-high';
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [deleteInProgress, setDeleteInProgress] = useState<string | null>(null);
  const [predictingUsers, setPredictingUsers] = useState<Set<string>>(new Set());
  const [predictionsComplete, setPredictionsComplete] = useState(false);

  const router = useRouter();
  const { isAuthenticated, isAdmin } = useAuth();
  const predictionsStarted = useRef<boolean>(false);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/admin/users', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch users: ${response.status}`);
        }

        const data = await response.json();
        setUsers(data.users || []);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('獲取用戶數據失敗');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && isAdmin) {
      fetchUsers();
    }
  }, [isAuthenticated, isAdmin]);

  // Redirect if not admin
  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/');
    }
  }, [loading, isAdmin, router]);

  // Handle sort
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle delete user
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('確定要刪除此用戶嗎？此操作無法撤銷。')) {
      return;
    }

    setDeleteInProgress(userId);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete user: ${response.status}`);
      }

      // Update users list after successful deletion
      setUsers(users.filter(user => user.userId !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      setError('刪除用戶失敗');
    } finally {
      setDeleteInProgress(null);
    }
  };

  // Filter and sort users
  const filteredUsers = users.filter(user => {
    // Apply search query filter
    const matchesSearch =
      (user.userName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (user.email.toLowerCase()).includes(searchQuery.toLowerCase()) ||
      (user.userId.toLowerCase()).includes(searchQuery.toLowerCase());

    // Apply role filter
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    // Apply risk filter if set
    const matchesRisk = riskFilter === 'all' || user.riskLevel === riskFilter;

    return matchesSearch && matchesRole && matchesRisk;
  });

  // Apply sorting
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let fieldA = a[sortField as keyof User];
    let fieldB = b[sortField as keyof User];

    // Handle undefined fields
    fieldA = fieldA || '';
    fieldB = fieldB || '';

    // Compare based on direction
    if (sortDirection === 'asc') {
      return fieldA < fieldB ? -1 : fieldA > fieldB ? 1 : 0;
    } else {
      return fieldA > fieldB ? -1 : fieldA < fieldB ? 1 : 0;
    }
  });

  // Get role badge class
  const roleBadgeClasses: Record<string, string> = {
    admin: 'bg-red-100 text-red-800',
    staff: 'bg-blue-100 text-blue-800',
    default: 'bg-gray-100 text-gray-800',
  };
  
  const getRoleBadgeClass = (role: string) => {
    return roleBadgeClasses[role] || roleBadgeClasses.default;
  };

  // Function to get risk badge color
  const riskBadgeClasses: Record<string, string> = {
    'very-high': 'bg-red-100 text-red-800',
    'high': 'bg-orange-100 text-orange-800', // Assuming orange for high
    'medium': 'bg-yellow-100 text-yellow-800', // Assuming yellow for medium
    'low': 'bg-green-100 text-green-800',   // Assuming green for low
    'default': 'bg-gray-100 text-gray-800',
  };

  const getRiskBadgeColor = (level?: string) => {
    return (level && riskBadgeClasses[level]) || riskBadgeClasses.default;
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return formatDateUtil(dateString); // Use imported formatter
  };

  // Enhanced function to analyze user risk
  const analyzeUserRisk = async (allUsers: User[]) => {
    // 只取有效 email：必须包含 “@”，且 “@” 前后都非空
    const users = allUsers.filter(u => {
      if (typeof u.email !== 'string') return false;
      const parts = u.email.split('@');
      return parts.length === 2
        && parts[0].trim().length > 0
        && parts[1].trim().length > 0;
    });

    if (users.length === 0 || predictionsStarted.current) {
      return allUsers;
    }

    predictionsStarted.current = true;
    setPredictionsComplete(false);

    // 标记预测中
    users.forEach(u =>
      setPredictingUsers(prev => new Set(prev).add(u.userId))
    );

    try {
      const batchResult = await batchAnalyzeUsers(users);
      // Use the new batch analysis endpoint
      if (batchResult.error) {
        throw new Error(batchResult.message);
      }

      // Update users with results
      interface BatchAnalyzeResult {
        userId: string;
        prediction?: {
          probability: number;
          riskLevel: 'low' | 'medium' | 'high' | 'very-high';
        };
        error?: string;
      }

      interface BatchAnalyzeResponse {
        results: BatchAnalyzeResult[];
        error?: boolean;
        message?: string;
      }

      (batchResult as BatchAnalyzeResponse).results.forEach((result: BatchAnalyzeResult) => {
        const userIndex = allUsers.findIndex((u: User) => u.userId === result.userId);

        if (userIndex >= 0) {
          if (result.error) {
            console.warn(`Error analyzing user ${result.userId}: ${result.error}`);
          } else if (result.prediction) {
            allUsers[userIndex] = {
              ...allUsers[userIndex],
              riskScore: result.prediction.probability,
              riskLevel: result.prediction.riskLevel
            };
          }

          // Remove from predicting set
          setPredictingUsers((prev: Set<string>) => {
            const updated = new Set([...prev]);
            updated.delete(result.userId);
            return updated;
          });
        }
      });

      // Update state with processed users
      setUsers(allUsers);

    } catch (err) {
      console.error('Error during batch risk analysis:', err);
    } finally {
      setPredictionsComplete(true);
      setPredictingUsers(new Set());
    }

    return allUsers;
  };

  // Trigger risk analysis when users are loaded
  useEffect(() => {
    if (users.length > 0 && !predictionsStarted.current && isAdmin) {
      analyzeUserRisk(users);
    }
  }, [users, isAdmin]);

  // Update the user table row to show prediction status
  const renderUserRow = (user: User) => {

    return (
      <tr key={user.userId} className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm font-medium text-gray-900">{user.userName || '未設定'}</div>
          <div className="text-xs text-gray-500">{user.userId.substring(0, 8)}...</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm text-gray-900">{user.email}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}>
            {user.role === 'admin' && '管理員'}
            {user.role === 'staff' && '員工'}
            {user.role === 'user' && '一般用戶'}
            {!['admin', 'staff', 'user'].includes(user.role) && user.role}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {user.phoneNumber || '未設定'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {formatDate(user.createdAt)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          {predictingUsers.has(user.userId) ? (
            <div className="flex items-center">
              <LoadingSpinner size="tiny" />
              <span className="ml-2 text-xs text-gray-500">分析中...</span>
            </div>
          ) : user.riskLevel ? (
            <div className="flex flex-col space-y-1">
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRiskBadgeColor(user.riskLevel)}`}>
                {user.riskLevel === 'very-high' && '極高風險'}
                {user.riskLevel === 'high' && '高風險'}
                {user.riskLevel === 'medium' && '中風險'}
                {user.riskLevel === 'low' && '低風險'}
              </span>
              {user.riskScore !== undefined && (
                <span className="text-xs text-gray-500">
                  風險分數: {(user.riskScore * 100).toFixed(1)}%
                </span>
              )}
            </div>
          ) : (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
              未分析
            </span>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <Link href={`/admin/users/${user.userId}`} className="text-blue-600 hover:text-blue-900 mr-4">
            查看
          </Link>
          {/* 
          <button
            onClick={() => handleRiskDetails(user)}
            className="text-blue-600 hover:text-blue-900 mr-4"
            title="查看風險評估詳情"
          >
            風險詳情
          </button> 
          */}
          <button
            onClick={() => handleDeleteUser(user.userId)}
            className="text-red-600 hover:text-red-900"
            disabled={deleteInProgress === user.userId}
          >
            刪除
          </button>
        </td>
      </tr>
    );
  };

  return (
    <AdminPage 
      title="用戶管理" 
      isLoading={loading}
      error={error}
    >
      {/* Filter Controls - Mobile Friendly */}
      <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜索用戶名、電郵或ID..."
              className="w-full p-3 border rounded-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="p-3 border rounded-md flex-1 min-w-[120px]"
            >
              <option value="all">所有角色</option>
              <option value="admin">管理員</option>
              <option value="staff">員工</option>
              <option value="user">一般用戶</option>
            </select>
            <select
              id="risk-filter"
              className="p-3 border rounded-md flex-1 min-w-[120px]"
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
            >
              <option value="all">所有風險級別</option>
              <option value="very-high">極高風險</option>
              <option value="high">高風險</option>
              <option value="medium">中等風險</option>
              <option value="low">低風險</option>
            </select>
          </div>
        </div>
        
        <div className="mt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          {/* Prediction status */}
          {users.length > 0 && (
            <div className="text-sm text-gray-500">
              {!predictionsComplete && predictingUsers.size > 0 ? (
                <div className="flex items-center">
                  <LoadingSpinner size="small" />
                  <span className="ml-2">自動風險評估中... ({Math.round((users.length - predictingUsers.size) / users.length * 100)}%)</span>
                </div>
              ) : predictionsComplete ? (
                <span className="text-green-600">✓ 風險評估已完成</span>
              ) : null}
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 mt-3 sm:mt-0">
            <button 
              onClick={() => {
                predictionsStarted.current = false;
                setPredictionsComplete(false);
                analyzeUserRisk(users);
              }}
              disabled={predictingUsers.size > 0}
              className="px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded disabled:opacity-50"
            >
              重新評估風險
            </button>
            <Link
              href="/admin/scalper-detection"
              className="px-3 py-2 text-sm bg-purple-600 text-white rounded"
            >
              黄牛檢測系統
            </Link>
          </div>
        </div>
      </div>

      {/* Users Table with Mobile Cards View */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('userName')}
                >
                  用戶名
                  {sortField === 'userName' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('email')}
                >
                  電郵
                  {sortField === 'email' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('role')}
                >
                  角色
                  {sortField === 'role' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('phoneNumber')}
                >
                  電話
                  {sortField === 'phoneNumber' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('createdAt')}
                >
                  註冊日期
                  {sortField === 'createdAt' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('riskLevel')}
                >
                  風險級別
                  {sortField === 'riskLevel' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedUsers.length > 0 ? (
                sortedUsers.map(renderUserRow)
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500 text-sm">
                    {loading ? (
                      <div className="flex justify-center py-4">
                        <LoadingSpinner size="small" />
                      </div>
                    ) : (
                      '沒有找到匹配的用戶'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Mobile Cards View */}
        <div className="md:hidden">
          {sortedUsers.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {sortedUsers.map((user) => (
                <div key={user.userId} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{user.userName || '未設定'}</h3>
                      <p className="text-xs text-gray-500">{user.email}</p>
                      <p className="text-xs text-gray-400">ID: {user.userId.substring(0, 8)}...</p>
                    </div>
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}>
                      {user.role === 'admin' && '管理員'}
                      {user.role === 'staff' && '員工'}
                      {user.role === 'user' && '一般用戶'}
                    </span>
                  </div>
                  
                  {/* Risk Level */}
                  <div className="mt-3">
                    {predictingUsers.has(user.userId) ? (
                      <div className="flex items-center">
                        <LoadingSpinner size="tiny" />
                        <span className="ml-2 text-xs text-gray-500">分析中...</span>
                      </div>
                    ) : user.riskLevel ? (
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRiskBadgeColor(user.riskLevel)}`}>
                          {user.riskLevel === 'very-high' && '極高風險'}
                          {user.riskLevel === 'high' && '高風險'}
                          {user.riskLevel === 'medium' && '中風險'}
                          {user.riskLevel === 'low' && '低風險'}
                        </span>
                        {user.riskScore !== undefined && (
                          <span className="text-xs text-gray-500">
                            {(user.riskScore * 100).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        未分析
                      </span>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="mt-3 flex gap-2">
                    <Link href={`/admin/users/${user.userId}`} className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded text-center text-sm">
                      查看
                    </Link>
                    <button
                      onClick={() => handleDeleteUser(user.userId)}
                      disabled={deleteInProgress === user.userId}
                      className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded text-center text-sm disabled:opacity-50"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              {loading ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner size="small" />
                </div>
              ) : (
                '沒有找到匹配的用戶'
              )}
            </div>
          )}
        </div>
      </div>
    </AdminPage>
  );
}
