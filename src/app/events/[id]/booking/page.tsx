'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/navbar/Navbar';
import db from '@/lib/db';
import { Events } from '@/types';

const PLATFORM_FEE = 18; // Platform fee per ticket in HKD

const BookingPage = () => {
  const router = useRouter();
  const { id } = useParams();
  const [event, setEvent] = useState<Events | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        const data = await db.event.findById(id as string);
        setEvent(data);
      } catch (error) {
        console.error('Error fetching event:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedZone) {
      alert('請選擇區域');
      return;
    }
    router.push(`/events/${id}/payment?zone=${selectedZone}&quantity=${quantity}`);
  };

  if (loading) return <div>Loading...</div>;
  if (!event) return <div>Event not found</div>;

  const selectedZoneDetails = event.zones?.find(z => z.name === selectedZone);
  const ticketPrice = selectedZoneDetails ? Number(selectedZoneDetails.price) : 0;
  const platformFeeTotal = PLATFORM_FEE * quantity;
  const subtotal = ticketPrice * quantity;
  const totalPrice = subtotal + platformFeeTotal;

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4 pt-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">{event.eventName} - 選擇門票</h1>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">座位分配提示</h3>
              <p className="text-yellow-700">
                為確保訂票過程公平，所選區域內的座位將會由系統隨機分配。座位號碼將在付款完成後即時顯示。
              </p>
            </div>

            <table className="w-full mb-6">
              <tbody className="divide-y">
                <tr className="py-2">
                  <td className="py-3 font-semibold">演出時間</td>
                  <td className="py-3">
                    {event.eventDate ? new Date(event.eventDate).toLocaleString() : 'N/A'}
                  </td>
                </tr>
                <tr className="py-2">
                  <td className="py-3 font-semibold">演出地點</td>
                  <td className="py-3">{event.location}</td>
                </tr>
              </tbody>
            </table>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block mb-2 font-semibold">
                  選擇區域: 
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    (座位將隨機分配)
                  </span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  {event.zones?.map(zone => (
                    <button
                      key={zone.name}
                      type="button"
                      onClick={() => setSelectedZone(zone.name)}
                      className={`
                        p-4 rounded-lg border-2 text-left transition-all
                        ${selectedZone === zone.name 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-blue-200'}
                      `}
                    >
                      <div className="font-semibold mb-1">{zone.name}區</div>
                      <div className="text-sm text-gray-600">
                        HKD {Number(zone.price).toLocaleString('en-HK')}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-w-xs">
                <label className="block mb-2 font-semibold">數量:</label>
                <select 
                  value={quantity} 
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full p-2 border rounded"
                  required
                >
                  {[1, 2, 3, 4].map(num => (
                    <option key={num} value={num}>{num} 張</option>
                  ))}
                </select>
              </div>

              {selectedZone && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-3">訂單摘要</h3>
                  <table className="w-full">
                    <tbody className="divide-y">
                      <tr>
                        <td className="py-2">門票價格</td>
                        <td className="py-2 text-right">
                          HKD {ticketPrice.toLocaleString('en-HK')} × {quantity}
                        </td>
                        <td className="py-2 text-right">
                          HKD {subtotal.toLocaleString('en-HK')}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2">平台費用</td>
                        <td className="py-2 text-right">
                          HKD {PLATFORM_FEE} × {quantity}
                        </td>
                        <td className="py-2 text-right">
                          HKD {platformFeeTotal.toLocaleString('en-HK')}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 font-bold">總計</td>
                        <td></td>
                        <td className="py-2 text-right font-bold">
                          HKD {totalPrice.toLocaleString('en-HK')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-between gap-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 px-6 py-2 rounded bg-gray-200 hover:bg-gray-300"
                >
                  返回
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
                >
                  前往付款
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default BookingPage;
