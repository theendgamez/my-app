"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminPage from '@/components/admin/AdminPage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import { predictScalper } from '@/utils/mlService';

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
  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'staff':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Function to get risk badge color
  const getRiskBadgeColor = (level?: string) => {
    switch (level) {
      case 'very-high': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('zh-HK');
  };

  // Function to process email for feature extraction
  const extractEmailFeatures = (email: string) => {
    const domain = email.split('@')[1] || '';

    const mainStreamDomains = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com'];
    const tempEmailDomains = ['tempmail.com', 'temp-mail.org', 'mailinator.com', '10minutemail.com'];

    const suspiciousPatterns = /\d{6,}|temp|disposable|fake|trash|junk/i;

    // Calculate simple Shannon entropy for the domain as a measure of randomness
    const calculateEntropy = (text: string): number => {
      const len = text.length;
      const frequencies = Array.from(text).reduce((freq: {[key: string]: number}, c) => {
        freq[c] = (freq[c] || 0) + 1;
        return freq;
      }, {});
      
      return Object.values(frequencies).reduce((sum, f) => {
        const p = f / len;
        return sum - p * Math.log2(p);
      }, 0);
    };

    // Check if domain contains numbers
    const hasNumbers = /\d/.test(domain) ? 1 : 0;

    return {
      popularity: 1, // Default value, ideally would be calculated from actual data
      is_common_provider: mainStreamDomains.includes(domain) ? 1 : 0,
      domain_length: domain.length,
      has_numbers: hasNumbers,
      is_common_tld: tempEmailDomains.includes(domain) ? 0 : 1, // Inverted logic from is_temporary
      entropy: calculateEntropy(domain),
      has_suspicious_keyword: suspiciousPatterns.test(domain) ? 1 : 0
    };
  };

  // Enhanced function to analyze user risk
  const analyzeUserRisk = async (users: User[]) => {
    if (users.length === 0 || predictionsStarted.current) return users;

    predictionsStarted.current = true;
    const newUsers = [...users];
    const batchSize = 5; // Process users in small batches to avoid overwhelming the API

    try {
      // Break users into batches to process
      for (let i = 0; i < newUsers.length; i += batchSize) {
        const batch = newUsers.slice(i, i + batchSize);

        // Process this batch in parallel
        await Promise.all(batch.map(async (user, index) => {
          const userIndex = i + index;

          // Skip if already has risk score
          if (user.riskScore !== undefined) return;

          setPredictingUsers(prev => new Set([...prev, user.userId]));

          try {
            // Extract features from email and user data
            const features = extractEmailFeatures(user.email);

            // Call ML service for prediction (pass features directly)
            const prediction = await predictScalper(features);

            if (!prediction.fallback) {
              // If we got a real prediction (not a fallback)
              const probabilityScore = prediction.prediction;

              // Determine risk level
              let riskLevel: 'low' | 'medium' | 'high' | 'very-high' = 'low';
              if (probabilityScore > 0.7) riskLevel = 'very-high';
              else if (probabilityScore > 0.5) riskLevel = 'high';
              else if (probabilityScore > 0.3) riskLevel = 'medium';

              // Update user with risk assessment
              newUsers[userIndex] = {
                ...newUsers[userIndex],
                riskScore: probabilityScore,
                riskLevel: riskLevel
              };
            }
          } catch (err) {
            console.error(`Error analyzing risk for user ${user.userId}:`, err);
          } finally {
            setPredictingUsers(prev => {
              const updated = new Set([...prev]);
              updated.delete(user.userId);
              return updated;
            });
          }
        }));

        // Update state with processed batch
        setUsers(newUsers);

        // Brief pause between batches to avoid rate limiting
        if (i + batchSize < newUsers.length) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
    } catch (err) {
      console.error('Error during batch risk analysis:', err);
    } finally {
      setPredictionsComplete(true);
    }

    return newUsers;
  };

  // Trigger risk analysis when users are loaded
  useEffect(() => {
    const analyzeUserRisk = async () => {
      // Function implementation
    };
  
    if (users.length > 0 && !predictionsStarted.current && isAdmin) {
      analyzeUserRisk();
    }
  }, [users, isAdmin]);

  // Update the user table row to show prediction status
  const renderUserRow = (user: User) => {
    function handleRiskDetails(user: User): void {
      throw new Error('Function not implemented.');
    }

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
          <button
            onClick={() => handleRiskDetails(user)}
            className="text-blue-600 hover:text-blue-900 mr-4"
            title="查看風險評估詳情"
          >
            風險詳情
          </button>
          <button
            onClick={() => handleDeleteUser(user.userId)}
            className={`text-red-600 hover:text-red-900 ${deleteInProgress === user.userId ? 'opacity-50 cursor-not-allowed' : ''}`}
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
      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜索用戶名、電郵或ID..."
              className="w-full p-2 border rounded-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="p-2 border rounded-md"
            >
              <option value="all">所有角色</option>
              <option value="admin">管理員</option>
              <option value="staff">員工</option>
              <option value="user">一般用戶</option>
            </select>
            <select
              id="risk-filter"
              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
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
          <div className="ml-auto">
            <Link
              href="/admin/scalper-detection"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
            >
              黄牛檢測系統
            </Link>
          </div>
        </div>

        {/* Add prediction status indicator */}
        {users.length > 0 && (
          <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
            <div>
              {!predictionsComplete && predictingUsers.size > 0 ? (
                <div className="flex items-center">
                  <LoadingSpinner size="small" />
                  <span className="ml-2">自動風險評估中... ({Math.round((users.length - predictingUsers.size) / users.length * 100)}%)</span>
                </div>
              ) : predictionsComplete ? (
                <span className="text-green-600">✓ 風險評估已完成</span>
              ) : null}
            </div>

            <button 
              onClick={() => {
                predictionsStarted.current = false;
                setPredictionsComplete(false);
                analyzeUserRisk(users);
              }}
              disabled={predictingUsers.size > 0}
              className="text-blue-600 hover:text-blue-800 disabled:text-gray-400"
            >
              重新評估風險
            </button>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
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
      </div>
    </AdminPage>
  );
}
