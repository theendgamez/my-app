import React from 'react';

interface TicketVerificationResultProps {
  result: {
    success: boolean;
    message: string;
    ticketInfo: {
      ticketId: string;
      eventName: string;
      userName: string;
      zone: string;
      usedAt: string;
      verifiedBy?: string;
      verificationCount?: number;
      location?: string;
    };
  };
}

export default function TicketVerificationResult({ result }: TicketVerificationResultProps) {
  return (
    <div className={`p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
      <div className="flex items-center mb-3">
        {result.success ? (
          <svg className="w-6 h-6 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        ) : (
          <svg className="w-6 h-6 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        )}
        <h2 className={`text-lg font-medium ${result.success ? 'text-green-700' : 'text-red-700'}`}>
          {result.message}
        </h2>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between border-b pb-2">
          <span className="font-medium">持票人:</span>
          <span>{result.ticketInfo.userName}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="font-medium">活動:</span>
          <span>{result.ticketInfo.eventName}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="font-medium">區域:</span>
          <span>{result.ticketInfo.zone}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="font-medium">使用時間:</span>
          <span>{result.ticketInfo.usedAt}</span>
        </div>
        
        {result.ticketInfo.verifiedBy && (
          <div className="flex justify-between border-b pb-2">
            <span className="font-medium">驗票人員:</span>
            <span>{result.ticketInfo.verifiedBy}</span>
          </div>
        )}
        
        {result.ticketInfo.location && (
          <div className="flex justify-between border-b pb-2">
            <span className="font-medium">驗證地點:</span>
            <span>{result.ticketInfo.location}</span>
          </div>
        )}
        
        {result.ticketInfo.verificationCount && result.ticketInfo.verificationCount > 1 && (
          <div className="flex justify-between">
            <span className="font-medium">嘗試次數:</span>
            <span>{result.ticketInfo.verificationCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}
