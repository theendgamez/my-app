"use client";

import { useState, useEffect } from 'react';
import AdminPage from '@/components/admin/AdminPage';
import { getBlockchainStats } from '@/lib/blockchain';
import BlockchainExplorer from '@/components/admin/BlockchainExplorer';






export default function AdminBlockchainPage() {
  const [, setStats] = useState({
    totalBlocks: 0,
    totalTransactions: 0,
    lastBlockTimestamp: null as number | null,
    isValid: false
  });

  useEffect(() => {
    const fetchStats = async () => {
      const blockchainStats = await getBlockchainStats();
      setStats(blockchainStats);
    };
    
    fetchStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AdminPage title="區塊鏈瀏覽器">  
        
        {/* Add the BlockchainExplorer component to display the chain */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">區塊鏈數據</h2>
          <BlockchainExplorer />
        </div>
    </AdminPage>
    
  );
}
