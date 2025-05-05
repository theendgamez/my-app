import React from 'react';
import { useRouter } from 'next/navigation';

interface Friend {
  friendshipId: string;
  friend: {
    userId: string;
    userName: string;
    email: string;
    phoneNumber: string;
  };
  acceptedAt: string;
  friendshipDays: number;
  canTransferTickets: boolean;
}

interface Props {
  friends: Friend[];
  onRemoveFriend: (friendshipId: string) => Promise<void>;
}

export default function FriendsList({ friends, onRemoveFriend }: Props) {
  const router = useRouter();

  // 格式化日期
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-HK', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch  {
      return dateString;
    }
  };

  if (friends.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <p className="text-gray-500">您還沒有任何好友</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <ul className="divide-y divide-gray-200">
        {friends.map((friendship) => (
          <li key={friendship.friendshipId} className="p-4 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 font-bold text-xl">
                  {friendship.friend.userName.charAt(0).toUpperCase()}
                </div>
                <div className="ml-4">
                  <div className="font-medium">{friendship.friend.userName}</div>
                  <div className="text-sm text-gray-500">{friendship.friend.email}</div>
                  <div className="flex items-center mt-1">
                    <span className="text-xs text-gray-400 mr-2">
                      成為好友於 {formatDate(friendship.acceptedAt)}
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-800 py-0.5 px-2 rounded-full">
                      {friendship.friendshipDays} 天
                    </span>
                    {friendship.canTransferTickets && (
                      <span className="text-xs bg-green-100 text-green-800 py-0.5 px-2 rounded-full ml-2">
                        可轉贈票券
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => router.push(`/user/tickets/transfer?friendId=${friendship.friend.userId}`)}
                  className={`px-4 py-1 rounded-md transition-colors ${
                    friendship.canTransferTickets
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                  disabled={!friendship.canTransferTickets}
                  title={!friendship.canTransferTickets ? '好友關係需滿7天才能轉贈票券' : '轉贈票券給此好友'}
                >
                  轉贈票券
                </button>
                <button
                  onClick={() => onRemoveFriend(friendship.friendshipId)}
                  className="px-4 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  刪除好友
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
