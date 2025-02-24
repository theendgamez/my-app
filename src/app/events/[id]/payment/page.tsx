'use client';

import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useState } from 'react';
import Navbar from '@/components/navbar/Navbar';
import { Payment } from '@/types';
async function storePaymentInDB(paymentData: Payment) {
  const response = await fetch('/api/payments', {
    method: 'POST',
    body: JSON.stringify(paymentData),
    headers: { 'Content-Type': 'application/json' },
  });
  return response.json();
}

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id } = useParams();
  const zone = searchParams.get('zone') || '';
  const quantity = parseInt(searchParams.get('quantity') || '1', 10);
  const price = parseInt(searchParams.get('price') || '0', 10);
  const totalPrice = price * quantity;

  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.userId) {
      alert('Please log in to make a payment');
      router.push(`/app/login`);
      return;
    }

    const paymentData = {
      paymentId: Math.floor(Math.random() * 1000000).toString(),
      eventId: id as string,
      userId: user.userId,
      userWallerAddress: user.blockchainAddress,
      user,
      zone,
      quantity,
      totalAmount: totalPrice,
      createdAt: new Date().toISOString(),
      status: 'completed' as 'completed' | 'pending' | 'failed',
      cardDetails: {
        lastFourDigits: cardNumber.slice(-4)
      }
    };

    try {
      const response = await storePaymentInDB(paymentData);
      if (response.tokenId) {
        alert('Payment successful and NFT transferred!');
        router.push(`/events/${id}/success?paymentId=${paymentData.paymentId}&tokenId=${response.tokenId}`);
      } else {
        alert('Payment successful!');
        router.push(`/events/${id}/success?paymentId=${paymentData.paymentId}`);
      }
    } catch (err) {
      alert('Payment failed!');
      console.error(err);
    }
  };

  return (
    <>
      <Navbar />
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded shadow">
        <h1 className="text-2xl font-bold mb-4">信用卡付款</h1>
        <p className="mb-2">區域: {zone}</p>
        <p className="mb-6">數量: {quantity}</p>

        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
          <div>
            <label className="block mb-1 font-semibold">
              卡號
            </label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold">
              到期日 (MM/YY)
            </label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold">
              CVC
            </label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={cvc}
              onChange={(e) => setCvc(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
          >
            支付
          </button>
        </form>
        <button
          type="button"
          onClick={async () => {
            // 模擬支付邏輯，將資料儲存到資料庫
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (!user.userId) {
              alert('Please log in to make a payment');
              return;
            }
            const testPaymentData = {
              paymentId: Math.floor(Math.random() * 1000000).toString(),
              eventId: id as string,
              userId: user.userId,
              userWallerAddress: user.blockchainAddress,
              user,
              zone,
              quantity,
              totalAmount: totalPrice,
              createdAt: new Date().toISOString(),
              status: 'completed' as 'completed' | 'pending' | 'failed',
              cardDetails: {
                lastFourDigits: cardNumber.slice(-4)
              }
            };
            await storePaymentInDB(testPaymentData);
            alert('Test button is successful');
            router.push(`/events/${id}/success`);
          }}

          
          className="mt-4 w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded"
        >
          Test
        </button>
      </div>
    </div>
    </>
  );
}