'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import db from '@/lib/db';
import { TicketMintRequest } from '@/types'; // Ensure this includes the price property
import { Events as EventType } from '@/types';
import Navbar from '@/components/navbar/Navbar';
import Sidebar from '@/components/Sidebar';
import { ethers } from 'ethers';
import TicketContract from '@/artifacts/contracts/TicketContract.sol/TicketContract.json';

const CreateTickets = () => {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [events, setEvents] = useState<EventType[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  const [remainingTickets, setRemainingTickets] = useState<number>(0);
  const [request, setRequest] = useState<TicketMintRequest>({
    eventId: '',
    zone: '',
    quantity: 1,
    pricePerTicket: 0 // Ensure this is included
  });
  const key = '0x941f99977ca2acc84b3c9354c286f593df7502cd9128766fbf5a1ef5144dec30'; // Replace with your actual private key
  const [counter, setCounter] = useState<number>(0);

  // Ganache Configuration
  const GANACHE_CONFIG = {
    rpcUrl: 'http://127.0.0.1:7545',
    chainId: 1337,
    gasPrice: ethers.parseUnits('20', 'gwei'), // 20 GWEI
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
      pricePerTicket: 0,
      quantity: 1 // Reset quantity when event changes
    }));
    setRemainingTickets(0); // Reset remaining tickets
  };

  const handleZoneChange = (zoneName: string) => {
    const zone = selectedEvent?.zones?.find(z => z.name === zoneName);
    if (!zone) return;

    setRequest(prev => ({
      ...prev,
      zone: zoneName,
      pricePerTicket: Number(zone.price) || 0,
      quantity: 1 // Reset quantity when zone changes
    }));

    // Calculate remaining tickets
    const remaining = Number(zone.max) - counter;
    setRemainingTickets(remaining);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (request.quantity > remainingTickets) {
      alert(`Maximum tickets available: ${remainingTickets}`);
      return;
    }
    setLoading(true);

    try {
      const provider = new ethers.JsonRpcProvider(GANACHE_CONFIG.rpcUrl);
      const wallet = new ethers.Wallet(key, provider);

      const network = await provider.getNetwork();
      if (Number(network.chainId) !== GANACHE_CONFIG.chainId) {
        throw new Error('Wrong network, please connect to Ganache');
      }

      const address = await wallet.getAddress();
      console.log('Using address:', address);

      const balance = await provider.getBalance(address);
      console.log('Wallet balance:', ethers.formatEther(balance), 'ETH');

      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';
      const contract = new ethers.Contract(contractAddress, TicketContract.abi, wallet);

      const event = events.find(e => e.eventId === request.eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      const numericId = BigInt(event.eventId);
      const nonce = await provider.getTransactionCount(address);

      // Convert event date to timestamp
      const eventDate = Math.floor(new Date(event.eventDate).getTime() / 1000); // Convert to seconds

      // Loop to create multiple tickets
      for (let i = 0; i < request.quantity; i++) {
        const tx = await contract.mintTicket(
          address,          // The address to mint the ticket to
          numericId,       // The event ID (should be a uint256)
          request.zone,    // The zone (should be a string)
          i + 1,           // The seat number (should be a uint256)
          request.pricePerTicket, // The price (should be a uint256)
          eventDate,       // The event date (should be a uint256 timestamp)
          {
            gasPrice: GANACHE_CONFIG.gasPrice,
            gasLimit: GANACHE_CONFIG.gasLimit,
            nonce: nonce + i // Use nonce for each transaction
          },
        );
        console.log('Transaction hash:', tx.hash);
        const receipt = await tx.wait();
        console.log('Transaction successful:', receipt);

        // Update the counter and remaining tickets in the database
        setCounter(prev => prev + 1);
        const zone = event.zones?.find(z => z.name === request.zone);
        if (zone) {
          const updatedMax = Number(zone.max) - (i + 1); // Decrease max by the number of tickets minted
          await db.event.updateZoneMax(event.eventId, request.zone, updatedMax);
        }
      }

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
                      {zone.name} - HKD {zone.price} (剩餘: {Number(zone.max) - counter})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {request.zone && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  數量 (最多: {remainingTickets})
                </label>
                <input
                  type="number"
                  min="1"
                  max={remainingTickets}
                  value={request.quantity}
                  onChange={(e) => setRequest(prev => ({
                    ...prev,
                    quantity: Math.min(parseInt(e.target.value), remainingTickets)
                  }))}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
            )}

            {remainingTickets > 0 && selectedEvent?.zones?.find(z => z.name === request.zone) && (
              <p>剩餘可創建票券數量: {Number(selectedEvent.zones.find(z => z.name === request.zone)?.max) - counter}</p>
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