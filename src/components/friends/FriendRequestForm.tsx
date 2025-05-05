import { useState } from 'react';

interface Props {
  onSendRequest: (email: string) => Promise<void>;
}

export default function FriendRequestForm({ onSendRequest }: Props) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) return;
    
    setIsSubmitting(true);
    try {
      await onSendRequest(email);
      setEmail(''); // 清空輸入框
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-lg font-medium mb-4">添加好友</h2>
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4">
        <div className="flex-grow">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="輸入好友電郵地址"
            className="w-full p-2 border rounded-md"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white py-2 px-6 rounded-md transition-colors"
        >
          {isSubmitting ? '發送中...' : '發送好友請求'}
        </button>
      </form>
    </div>
  );
}
