import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Image from 'next/image';

interface QRCodeDisplayProps {
  qrCode?: string;
  ticketId: string;
  size?: number;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  qrCode,
  ticketId,
  size = 180,
}) => {
  const [qrValue, setQrValue] = useState<string>('');
  const [isDataUrl, setIsDataUrl] = useState<boolean>(false);

  useEffect(() => {
    if (qrCode) {
      if (qrCode.startsWith('data:image/')) {
        setIsDataUrl(true);
        setQrValue(qrCode);
      } else {
        setIsDataUrl(false);
        setQrValue(qrCode);
      }
    } else {
      // Default to ticketId if no QR code provided
      setIsDataUrl(false);
      setQrValue(ticketId);
    }
  }, [qrCode, ticketId]);

  if (isDataUrl) {
    return (
      <div style={{ width: size, height: size }}>
        <Image
          src={qrValue}
          alt="Ticket QR Code"
          width={size}
          height={size}
          className="rounded"
        />
      </div>
    );
  }

  return (
    <QRCodeSVG
      value={qrValue}
      size={size}
      level="H"
      includeMargin={true}
    />
  );
};

export default QRCodeDisplay;
