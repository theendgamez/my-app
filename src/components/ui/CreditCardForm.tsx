import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface CardData {
  cardNumber: string;
  expiryDate: string;
  cvc: string;
  cardholderName: string;
}

interface CreditCardFormProps {
  onSubmit: (cardData: CardData) => void;
  isProcessing: boolean;
}

export default function CreditCardForm({ onSubmit, isProcessing }: CreditCardFormProps) {
  const [cardData, setCardData] = useState<CardData>({
    cardNumber: '',
    expiryDate: '',
    cvc: '',
    cardholderName: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted, sending card data to parent component");
    onSubmit(cardData);
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          持卡人姓名
        </label>
        <input
          type="text"
          required
          value={cardData.cardholderName}
          onChange={(e) => setCardData({...cardData, cardholderName: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="請輸入持卡人姓名"
          disabled={isProcessing}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          信用卡號碼
        </label>
        <input
          type="text"
          required
          value={cardData.cardNumber}
          onChange={(e) => setCardData({...cardData, cardNumber: formatCardNumber(e.target.value)})}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="1234 5678 9012 3456"
          maxLength={19}
          disabled={isProcessing}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            有效期限
          </label>
          <input
            type="text"
            required
            value={cardData.expiryDate}
            onChange={(e) => setCardData({...cardData, expiryDate: formatExpiryDate(e.target.value)})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="MM/YY"
            maxLength={5}
            disabled={isProcessing}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            安全碼
          </label>
          <input
            type="text"
            required
            value={cardData.cvc}
            onChange={(e) => setCardData({...cardData, cvc: e.target.value.replace(/[^0-9]/g, '').substring(0, 4)})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="123"
            maxLength={4}
            disabled={isProcessing}
          />
        </div>
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={isProcessing}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <div className="flex items-center justify-center">
              <LoadingSpinner size="small" color="white" className="mr-2" />
              處理中...
            </div>
          ) : (
            `確認付款`
          )}
        </button>
      </div>
    </form>
  );
}