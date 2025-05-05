import React from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  qrCode?: string;
  ticketId: string;
  size?: number;
}

export default function QRCodeDisplay({ qrCode, ticketId, size = 150 }: QRCodeDisplayProps) {
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);
  
  // Generate QR code on component mount
  React.useEffect(() => {
    async function generateQR() {
      try {
        // If qrCode starts with data:image or http, it's already an image
        if (qrCode?.startsWith('data:image/') || qrCode?.startsWith('http')) {
          setQrDataUrl(qrCode);
          return;
        }
        
        // Otherwise, generate a QR code from the string value
        if (qrCode) {
          const dataUrl = await QRCode.toDataURL(qrCode);
          setQrDataUrl(dataUrl);
        } else if (ticketId) {
          // Fallback to ticketId if no qrCode is provided
          const dataUrl = await QRCode.toDataURL(ticketId);
          setQrDataUrl(dataUrl);
        }
      } catch (err) {
        console.error('Error generating QR code:', err);
      }
    }
    
    generateQR();
  }, [qrCode, ticketId]);
  
  // Show placeholder while loading or if generation fails
  if (!qrDataUrl) {
    return (
      <div className="flex flex-col items-center">
        <div className="bg-gray-100 p-3 rounded-lg shadow-sm border flex items-center justify-center" style={{ width: size, height: size }}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          {ticketId.substring(0, 8)}...
        </p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white p-3 rounded-lg shadow-sm border">
        <Image 
          src={qrDataUrl}
          alt={`Ticket QR Code: ${ticketId}`}
          width={size}
          height={size}
          className="rounded"
        />
      </div>
      <p className="text-xs text-gray-500 mt-2 text-center">
        {ticketId.substring(0, 8)}...
      </p>
    </div>
  );
}
