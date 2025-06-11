"use client";

import { useState, useEffect } from 'react';
import LoadingSpinner from '../ui/LoadingSpinner';
import React from 'react';

interface Transaction {
  ticketId: string;
  timestamp: string | number;
  action: 'create' | 'transfer' | 'use' | 'verify' | 'cancel';
  fromUserId?: string;
  toUserId?: string;
  eventId: string;
  signature: string;
}

interface Block {
  index: number;
  timestamp: number;
  hash: string;
  previousHash: string;
  nonce: number;
  transactions: Transaction[];
  dataType: 'transactions' | 'genesis';
}

interface BlockchainStats {
  totalBlocks: number;
  totalTransactions: number;
  genesisTimestamp: string | null;
  latestTimestamp: string | null;
}

export default function BlockchainExplorer() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blockchain, setBlockchain] = useState<Block[]>([]);
  const [stats, setStats] = useState<BlockchainStats>({
    totalBlocks: 0,
    totalTransactions: 0,
    genesisTimestamp: null,
    latestTimestamp: null
  });
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredBlocks, setFilteredBlocks] = useState<Block[]>([]);

  // Fetch blockchain data
  useEffect(() => {
    const fetchBlockchainData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch('/api/admin/blockchain', {
          headers: {
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
          }
        });
        
        if (!response.ok) {
          throw new Error(`請求失敗: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.chain && Array.isArray(data.chain)) {
          setBlockchain(data.chain);
          setFilteredBlocks(data.chain);

          // Add logging to debug empty blockchain issue
          console.log('Blockchain data loaded:', {
            chainLength: data.chain.length,
            firstBlock: data.chain[0],
            hasTransactions: data.chain.some((block: { transactions: string | unknown[]; }) => 
              Array.isArray(block.transactions) && block.transactions.length > 0
            )
          });
        } else {
          console.warn('Unexpected blockchain data format:', data);
        }
        
        if (data.stats) {
          setStats(data.stats);
        }
      } catch (err) {
        console.error('Error fetching blockchain data:', err);
        setError(err instanceof Error ? err.message : '獲取數據時出錯');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBlockchainData();
  }, []);

  // Filter blocks when searchQuery changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredBlocks(blockchain);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = blockchain.filter(block => {
      // Search in block data
      if (block.hash.toLowerCase().includes(query)) return true;
      if (block.previousHash.toLowerCase().includes(query)) return true;
      if (block.index.toString().includes(query)) return true;
      
      // Search in transactions
      if (block.transactions && block.transactions.length > 0) {
        return block.transactions.some(tx => 
          tx.ticketId.toLowerCase().includes(query) ||
          (tx.fromUserId && tx.fromUserId.toLowerCase().includes(query)) ||
          (tx.toUserId && tx.toUserId.toLowerCase().includes(query)) ||
          tx.eventId.toLowerCase().includes(query) ||
          tx.action.toLowerCase().includes(query)
        );
      }
      
      return false;
    });
    
    setFilteredBlocks(filtered);
  }, [searchQuery, blockchain]);

  // Format timestamp
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-HK');
  };

  // Get transaction action translation
  const getActionText = (action: string) => {
    switch (action) {
      case 'create': return '創建票券';
      case 'transfer': return '轉讓票券';
      case 'use': return '使用票券';
      case 'verify': return '驗證票券';
      case 'cancel': return '取消票券';
      default: return action;
    }
  };

  // Toggle block selection
  const toggleBlockSelection = (index: number) => {
    setSelectedBlock(selectedBlock === index ? null : index);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
        <h3 className="font-semibold text-lg mb-2">載入區塊鏈數據時出錯</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Blockchain Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">總區塊數</div>
          <div className="text-2xl font-semibold">{stats.totalBlocks}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">總交易數</div>
          <div className="text-2xl font-semibold">{stats.totalTransactions}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">創世區塊時間</div>
          <div className="text-sm">{stats.genesisTimestamp ? new Date(stats.genesisTimestamp).toLocaleString('zh-HK') : 'N/A'}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">最新區塊時間</div>
          <div className="text-sm">{stats.latestTimestamp ? new Date(stats.latestTimestamp).toLocaleString('zh-HK') : 'N/A'}</div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="搜索區塊哈希、票券ID、用戶ID或事件ID..."
          className="w-full p-3 border rounded-md"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Blockchain Visualization */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold">區塊鏈瀏覽器</h2>
          <p className="text-sm text-gray-500">
            {filteredBlocks.length} 個區塊 
            {searchQuery && ` (搜索 "${searchQuery}" 的結果)`}
          </p>
        </div>
        
        {filteredBlocks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchQuery ? '沒有找到匹配的區塊' : '區塊鏈中沒有區塊'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    區塊 #
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    時間戳
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    哈希值
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    交易數
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBlocks.map((block) => (
                  <React.Fragment key={block.index}>
                    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleBlockSelection(block.index)}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{block.index}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{formatDate(block.timestamp)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-gray-900">
                          {block.hash.substring(0, 8)}...{block.hash.substring(block.hash.length - 8)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {block.dataType === 'genesis' 
                            ? <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">創世區塊</span>
                            : block.transactions.length
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                        {selectedBlock === block.index ? '收起' : '查看詳情'}
                      </td>
                    </tr>
                    
                    {/* Expanded Block Details */}
                    {selectedBlock === block.index && (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 bg-gray-50">
                          <div className="mb-3">
                            <div className="text-xs text-gray-500 mb-1">完整哈希值</div>
                            <div className="text-sm font-mono break-all">{block.hash}</div>
                          </div>
                          <div className="mb-3">
                            <div className="text-xs text-gray-500 mb-1">前一區塊哈希值</div>
                            <div className="text-sm font-mono break-all">{block.previousHash}</div>
                          </div>
                          <div className="mb-3">
                            <div className="text-xs text-gray-500 mb-1">Nonce</div>
                            <div className="text-sm">{block.nonce}</div>
                          </div>
                          
                          {/* Transactions */}
                          {block.dataType === 'transactions' && block.transactions.length > 0 ? (
                            <div>
                              <div className="text-sm font-medium mb-2">交易列表 ({block.transactions.length})</div>
                              <div className="bg-white border rounded-md">
                                <div className="overflow-x-auto">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-100">
                                      <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">票券 ID</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">操作</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">時間戳</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">用戶</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">活動 ID</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                      {block.transactions.map((tx, txIndex) => (
                                        <tr key={txIndex} className="hover:bg-gray-50">
                                          <td className="px-4 py-2 text-sm font-mono">
                                            {tx.ticketId.substring(0, 8)}...
                                          </td>
                                          <td className="px-4 py-2">
                                            <span className={`px-2 py-1 text-xs rounded-full ${
                                              tx.action === 'create' ? 'bg-green-100 text-green-800' :
                                              tx.action === 'transfer' ? 'bg-blue-100 text-blue-800' :
                                              tx.action === 'use' ? 'bg-purple-100 text-purple-800' :
                                              tx.action === 'verify' ? 'bg-yellow-100 text-yellow-800' :
                                              'bg-gray-100 text-gray-800'
                                            }`}>
                                              {getActionText(tx.action)}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2 text-xs text-gray-500">
                                            {typeof tx.timestamp === 'string' 
                                              ? new Date(tx.timestamp).toLocaleString('zh-HK')
                                              : formatDate(tx.timestamp as number)
                                            }
                                          </td>
                                          <td className="px-4 py-2 text-xs">
                                            {tx.action === 'transfer' ? (
                                              <div>
                                                <div>從: {tx.fromUserId ? tx.fromUserId.substring(0, 8) + '...' : 'N/A'}</div>
                                                <div>至: {tx.toUserId ? tx.toUserId.substring(0, 8) + '...' : 'N/A'}</div>
                                              </div>
                                            ) : (
                                              tx.fromUserId ? tx.fromUserId.substring(0, 8) + '...' : 'N/A'
                                            )}
                                          </td>
                                          <td className="px-4 py-2 text-xs font-mono">
                                            {tx.eventId.substring(0, 8)}...
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          ) : block.dataType === 'genesis' ? (
                            <div className="p-3 bg-blue-50 text-blue-700 rounded text-sm">
                              這是創世區塊，不包含任何交易數據
                            </div>
                          ) : (
                            <div className="p-3 bg-gray-50 text-gray-500 rounded text-sm">
                              此區塊不包含任何交易
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
