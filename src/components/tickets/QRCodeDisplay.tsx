import React from 'react';
import Image from 'next/image';

interface QRCodeDisplayProps {
  qrCode?: string;  // Make qrCode optional
  ticketId: string;
  size?: number;
}

export default function QRCodeDisplay({ qrCode, ticketId, size = 150 }: QRCodeDisplayProps) {
  // Handle undefined/null qrCode
  if (!qrCode) {
    // Return placeholder when no QR code is available
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

  // Check if qrCode is a data URL or an external URL
  const isDataUrl = qrCode.startsWith('data:image');
  
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white p-3 rounded-lg shadow-sm border">
        {isDataUrl ? (
          // Use Image component for data URLs
          <Image 
            src={qrCode} 
            alt={`Ticket QR code ${ticketId}`} 
            width={size} 
            height={size}
            className="mx-auto"
          />
        ) : (
          // Use regular img for external URLs
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrCode}
            alt={`Ticket QR code ${ticketId}`}
            width={size}
            height={size}
            className="mx-auto"
          />
        )}
      </div>
      <p className="text-xs text-gray-500 mt-2 text-center">
        {ticketId.substring(0, 8)}...
      </p>
    </div>
  );
}
