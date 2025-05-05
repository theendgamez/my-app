import React from 'react';

interface PendingRequest {
  friendshipId: string;
  requester: {
    userId: string;
    userName: string;
    email: string;
  };
  createdAt: string;
}

interface Props {
  pendingRequests: PendingRequest[];
  onAcceptRequest: (friendshipId: string) => Promise<void>;
  onRejectRequest: (friendshipId: string) => Promise<void>;
}

export default function PendingRequestsList({ pendingRequests, onAcceptRequest, onRejectRequest }: Props) {
  // 格式化日期
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-HK', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (pendingRequests.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <p className="text-gray-500">沒有待處理的好友請求</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <ul className="divide-y divide-gray-200">
        {pendingRequests.map((request) => (
          <li key={request.friendshipId} className="p-4 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 font-bold">
                  {request.requester.userName.charAt(0).toUpperCase()}
                </div>
                <div className="ml-4">
                  <div className="font-medium">{request.requester.userName}</div>
                  <div className="text-sm text-gray-500">{request.requester.email}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    請求於 {formatDate(request.createdAt)}
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => onAcceptRequest(request.friendshipId)}
                  className="px-4 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  接受
                </button>
                <button
                  onClick={() => onRejectRequest(request.friendshipId)}
                  className="px-4 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  拒絕
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
