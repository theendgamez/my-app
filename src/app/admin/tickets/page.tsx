'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ticket, Events} from '@/types';

import Navbar from '@/components/navbar/Navbar';
import Sidebar from '@/components/Sidebar';
import db from '@/lib/db';
import { mintTicket } from '@/utils/blockchainService';



interface TicketMintRequest {
  eventId: string;
  zone: string;
  quantity: number;
  pricePerTicket: number;
}

export default function AdminTicketsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Events[]>([]); // Assuming Event type is defined
  const [selectedEvent, setSelectedEvent] = useState<Events | null>(null);
  const [request, setRequest] = useState<TicketMintRequest>({
    eventId: '',
    zone: '',
    quantity: 1,
    pricePerTicket: 0,
  });
  const [remainingTickets, setRemainingTickets] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch events on component mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Implement fetch logic
        const fetchedEvents: Events[] = await fetchEventsFromDB(); // Define this function
        setEvents(fetchedEvents);
      } catch (error) {
        console.error('Failed to fetch events:', error);
      }
    };

    fetchEvents();
  }, []);

  const handleEventChange = (eventId: string) => {
    const event = events.find((e) => e.eventId === eventId);
    setSelectedEvent(event || null);
    setRequest({
      ...request,
      eventId,
      zone: '',
      pricePerTicket: 0,
      quantity: 1,
    });
    setRemainingTickets(0);
  };

  const handleZoneChange = (zoneName: string) => {
    const zone = selectedEvent?.zones.find((z) => z.name === zoneName);
    if (!zone) return;

    setRequest({
      ...request,
      zone: zoneName,
      pricePerTicket: Number(zone.price),
      quantity: 1,
    });
    const remaining = Math.min(Number(zone.max), Number(zone.remaining));
    setRemainingTickets(remaining);
  };


  const fetchEventsFromDB = async (): Promise<Events[]> => {
    // Implement fetch logic
    return db.event.findMany()
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (request.quantity > remainingTickets) {
      alert(`最多可用票數：${remainingTickets}`);
      return;
    }
    setLoading(true);

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      if (!user.userId || !user.blockchainAddress) {
        throw new Error('User ID and Blockchain Address are required');
      }

      const eventDate = Math.floor(new Date(selectedEvent?.eventDate || '').getTime() / 1000);


      for (let i = 0; i < request.quantity; i++) {
        // Mint Ticket and get transaction hash
        const tokenId = await mintTicket(
          user.blockchainAddress,
          Number(request.eventId),
          request.zone,
          i + 1,
          request.pricePerTicket,
          eventDate
        );

        // Store ticket information in the database
        const ticketData: Ticket = {
          ticketId: `${request.eventId}-${request.zone}-${i + 1}`,
          eventId: request.eventId,
          zone: request.zone,
          userId: user.userId,
          blockchainAddress: user.blockchainAddress,
          status: 'minted',
          tokenId: tokenId.toString(),
        };

        await db.tickets.create(ticketData);
      }

      // Update remaining tickets in the database
      const newRemaining = remainingTickets - request.quantity;
      await db.event.updateZoneRemaining(request.eventId, request.zone, newRemaining);

      alert('票券創建成功！');
      router.push('/admin/tickets');
    } catch (error) {
      console.error('創建票券失敗:', error);
      alert('票券創建失敗，請重試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <Sidebar />
      <div className="container mx-auto p-8">
        <div className="max-w-xl mx-auto bg-white shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-6">創建門票</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Event Selection */}
            <div>
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

            {/* Zone Selection */}
            {selectedEvent && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">區域</label>
                <select
                  value={request.zone}
                  onChange={(e) => handleZoneChange(e.target.value)}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">選擇區域</option>
                  {selectedEvent.zones.map((zone) => (
                    <option key={zone.name} value={zone.name}>
                      {zone.name} - ${zone.price} - Remaining: {zone.remaining}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quantity */}
            {selectedEvent && request.zone && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">數量</label>
                <input
                  type="number"
                  min="1"
                  max={remainingTickets}
                  value={request.quantity}
                  onChange={(e) => setRequest({ ...request, quantity: Number(e.target.value) })}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">最多可購買：{remainingTickets}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full ${
                loading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
              } text-white py-2 px-4 rounded transition-colors`}
            >
              {loading ? '創建中...' : '創建門票'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}