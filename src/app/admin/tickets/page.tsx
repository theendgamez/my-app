'use client';

declare global {
  interface Window {
    ethereum?: ethers.providers.ExternalProvider;
  }
}

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import db from '@/lib/db';
import { TicketMintRequest } from '@/types';
import { Events as EventType } from '@/types';
import Navbar from '@/components/navbar/Navbar';
import Sidebar from '@/components/Sidebar';
import { ethers } from 'ethers';
import TicketContract from '@/artifacts/contracts/TicketContract.sol/TicketContract.json';

const CreateTickets = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<EventType[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  const [maxTickets, setMaxTickets] = useState<number>(0);
  const [request, setRequest] = useState<TicketMintRequest>({
    eventId: '',
    zone: '',
    quantity: 1,
    pricePerTicket: 0
  });
  const ADMIN_PRIVATE_KEY = '0xf15051ba37d8c8b4ed0bc3a6147c0de9da4f535162cd700255ee6866d2d59583';

  // Ganache Configuration
  const GANACHE_CONFIG = {
    rpcUrl: 'http://127.0.0.1:5545',
    chainId: 1337,
    gasPrice: ethers.utils.parseUnits('20', 'gwei'), // 20 GWEI
    gasLimit: 6721975,
  };

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await db.event.findMany();
        setEvents(data as EventType[]);
      } catch (error) {
        console.error('Failed to fetch events:', error);
      }
    };

    fetchEvents();
  }, []);

  const handleEventChange = (eventId: string) => {
    const event = events.find(e => e.eventId === eventId);
    setSelectedEvent(event || null);
    setRequest(prev => ({
      ...prev,
      eventId,
      zone: '',
      pricePerTicket: 0
    }));
    setMaxTickets(0);
  };

  const handleZoneChange = (zoneName: string) => {
    const zone = selectedEvent?.zones?.find(z => z.name === zoneName);
    setRequest(prev => ({
      ...prev,
      zone: zoneName,
      pricePerTicket: Number(zone?.price) || 0,
      quantity: 1
    }));
    setMaxTickets(Number(zone?.total) || 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (request.quantity > maxTickets) {
      alert(`Maximum tickets available: ${maxTickets}`);
      return;
    }
    setLoading(true);

    try {
      // Connect to Ganache
      const provider = new ethers.providers.JsonRpcProvider(GANACHE_CONFIG.rpcUrl);
      const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
      
      // Verify network
      const network = await provider.getNetwork();
      if (network.chainId !== GANACHE_CONFIG.chainId) {
        throw new Error('Wrong network, please connect to Ganache');
      }

      const address = await wallet.getAddress();
      console.log('Using address:', address);
      
      // Check wallet balance
      const balance = await provider.getBalance(address);
      console.log('Wallet balance:', ethers.utils.formatEther(balance), 'ETH');

      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';
      const contract = new ethers.Contract(contractAddress, TicketContract.abi, wallet);

      const event = events.find(e => e.eventId === request.eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      const numericId = event.eventId;
      const zone = ethers.utils.formatBytes32String(request.zone);

      // Use Ganache's fixed gas price
      console.log('Using Ganache gas price:', ethers.utils.formatUnits(GANACHE_CONFIG.gasPrice, 'gwei'), 'gwei');

      const tx = await contract.mintTicket(
        address,
        ethers.BigNumber.from(numericId),
        zone,
        request.quantity,
        ethers.utils.parseEther(request.pricePerTicket.toString()),
        {
          gasPrice: GANACHE_CONFIG.gasPrice,
          gasLimit: GANACHE_CONFIG.gasLimit,
          nonce: await provider.getTransactionCount(address)
        }
      );

      console.log('Transaction hash:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction successful:', receipt);
      alert('Tickets created successfully!');
      router.push('/admin/tickets');
    } catch (error) {
      console.error('Failed to create tickets:', error);
      alert(`Failed to create tickets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <Sidebar />
      <div className="container mx-auto p-8">
        <div className="max-w-[210mm] mx-auto bg-white shadow-lg p-[20mm] min-h-[297mm] print:shadow-none">
          <h1 className="text-2xl font-bold mb-6">創建門票</h1>
          
          {/* Remove wallet connection UI since we're using admin account directly */}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-2">活動</label>
              <select
                value={request.eventId}
                onChange={(e) => handleEventChange(e.target.value)}
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">選擇活動</option>
                {events.map((event) => (
                  <option key={event.eventId} value={event.eventId}>
                    {event.eventName}
                  </option>
                ))}
              </select>
            </div>

            {selectedEvent && (
              <div>
                <label className="block text-sm font-medium mb-2">區域</label>
                <select
                  value={request.zone}
                  onChange={(e) => handleZoneChange(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">選擇區域</option>
                  {selectedEvent.zones?.map((zone) => (
                    <option key={zone.name} value={zone.name}>
                      {zone.name} - HKD {zone.price} (剩餘: {zone.total})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {request.zone && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  數量 (最多: {maxTickets})
                </label>
                <input
                  type="number"
                  min="1"
                  max={maxTickets}
                  value={request.quantity}
                  onChange={(e) => setRequest(prev => ({
                    ...prev,
                    quantity: Math.min(parseInt(e.target.value), maxTickets)
                  }))}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full ${loading
                ? 'bg-gray-400'
                : 'bg-blue-500 hover:bg-blue-600'
                } text-white py-2 px-4 rounded-md transition-colors`}
            >
              {loading ? '創建中...' : '創建門票'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTickets;