"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminPage from '@/components/admin/AdminPage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';

interface User {
  userId: string;
  userName?: string;
  email: string;
  role: string;
  createdAt?: string;
  phoneNumber?: string;
  status?: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [deleteInProgress, setDeleteInProgress] = useState<string | null>(null);
  
  const router = useRouter();
  const { isAuthenticated, isAdmin } = useAuth();
  
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
    
    return matchesSearch && matchesRole;
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

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('zh-HK');
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
          </div>
        </div>
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
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedUsers.length > 0 ? (
                sortedUsers.map((user) => (
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          href={`/admin/users/${user.userId}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          查看
                        </Link>
                        <Link
                          href={`/admin/users/edit/${user.userId}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          編輯
                        </Link>
                        <button
                          onClick={() => handleDeleteUser(user.userId)}
                          disabled={deleteInProgress === user.userId}
                          className={`text-red-600 hover:text-red-900 ${deleteInProgress === user.userId ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {deleteInProgress === user.userId ? '刪除中...' : '刪除'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500 text-sm">
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
