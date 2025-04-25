import { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface CreditCardFormProps {
  onSubmit: (cardData: {
    cardNumber: string;
    expiryDate: string;
    cvc: string;
    cardholderName: string;
  }) => void;
  isProcessing: boolean;
}

export default function CreditCardForm({ onSubmit, isProcessing }: CreditCardFormProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatCardNumber = (input: string) => {
    // Remove non-digits
    const digits = input.replace(/\D/g, '');
    // Limit to 16 digits
    const limitedDigits = digits.slice(0, 16);
    // Add spaces every 4 digits
    return limitedDigits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiryDate = (input: string) => {
    // Remove non-digits
    const digits = input.replace(/\D/g, '');
    // Limit to 4 digits
    const limitedDigits = digits.slice(0, 4);
    // Add slash after first 2 digits if we have more than 2
    if (limitedDigits.length > 2) {
      return `${limitedDigits.slice(0, 2)}/${limitedDigits.slice(2)}`;
    }
    return limitedDigits;
  };

  const formatCVC = (input: string) => {
    // Remove non-digits and limit to 3-4 characters
    return input.replace(/\D/g, '').slice(0, 4);
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardNumber(formatCardNumber(e.target.value));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExpiryDate(formatExpiryDate(e.target.value));
  };

  const handleCVCChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCvc(formatCVC(e.target.value));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validate card number (16 digits)
    if (cardNumber.replace(/\s/g, '').length !== 16) {
      newErrors.cardNumber = '請輸入16位數字的信用卡號';
    }

    // Validate cardholder name
    if (!cardholderName.trim()) {
      newErrors.cardholderName = '請輸入持卡人姓名';
    }

    // Validate expiry date (MM/YY format)
    const expiryPattern = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
    if (!expiryPattern.test(expiryDate)) {
      newErrors.expiryDate = '請輸入有效的到期日（MM/YY）';
    } else {
      // Check if card is expired
      const [month, year] = expiryDate.split('/');
      const expiryYear = parseInt(`20${year}`, 10);
      const expiryMonth = parseInt(month, 10) - 1; // JS months are 0-indexed
      const cardExpiryDate = new Date(expiryYear, expiryMonth, 1);
      const today = new Date();
      
      if (cardExpiryDate < today) {
        newErrors.expiryDate = '卡片已過期';
      }
    }

    // Validate CVC (3-4 digits)
    if (cvc.length < 3) {
      newErrors.cvc = '請輸入3-4位數字的安全碼';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSubmit({
      cardNumber: cardNumber.replace(/\s/g, ''),
      expiryDate,
      cvc,
      cardholderName,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block mb-1 font-semibold">
          持卡人姓名
        </label>
        <input
          type="text"
          className={`w-full p-2 border rounded ${errors.cardholderName ? 'border-red-500' : ''}`}
          placeholder="請輸入姓名"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          disabled={isProcessing}
        />
        {errors.cardholderName && (
          <p className="text-red-500 text-xs mt-1">{errors.cardholderName}</p>
        )}
      </div>
      
      <div>
        <label className="block mb-1 font-semibold">
          卡號
        </label>
        <input
          type="text"
          className={`w-full p-2 border rounded ${errors.cardNumber ? 'border-red-500' : ''}`}
          placeholder="1234 5678 9012 3456"
          value={cardNumber}
          onChange={handleCardNumberChange}
          disabled={isProcessing}
        />
        {errors.cardNumber && (
          <p className="text-red-500 text-xs mt-1">{errors.cardNumber}</p>
        )}
      </div>
      
      <div className="flex space-x-4">
        <div className="w-1/2">
          <label className="block mb-1 font-semibold">
            到期日
          </label>
          <input
            type="text"
            className={`w-full p-2 border rounded ${errors.expiryDate ? 'border-red-500' : ''}`}
            placeholder="MM/YY"
            value={expiryDate}
            onChange={handleExpiryChange}
            disabled={isProcessing}
          />
          {errors.expiryDate && (
            <p className="text-red-500 text-xs mt-1">{errors.expiryDate}</p>
          )}
        </div>
        
        <div className="w-1/2">
          <label className="block mb-1 font-semibold">
            CVC 安全碼
          </label>
          <input
            type="text"
            className={`w-full p-2 border rounded ${errors.cvc ? 'border-red-500' : ''}`}
            placeholder="123"
            value={cvc}
            onChange={handleCVCChange}
            disabled={isProcessing}
          />
          {errors.cvc && (
            <p className="text-red-500 text-xs mt-1">{errors.cvc}</p>
          )}
        </div>
      </div>
      
      <button
        type="submit"
        disabled={isProcessing}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded flex justify-center items-center disabled:bg-blue-300"
      >
        {isProcessing ? (
          <>
            <div className="mr-2">
              <LoadingSpinner size="small" />
            </div>
            處理中...
          </>
        ) : (
          '確認付款'
        )}
      </button>
    </form>
  );
}