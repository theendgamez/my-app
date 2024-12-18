import { cookies } from 'next/headers';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

export default async function Home() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user');
  const user = userCookie ? JSON.parse(userCookie.value) : null;
  const isAdmin = user?.role === 'admin';


  return (
    <div className="min-h-screen flex">
      {/* 當用戶是管理員時顯示 Sidebar */}
      {isAdmin && <Sidebar />}

      {/* 主內容區域 */}
      <div className={`flex-1 flex flex-col ${isAdmin ? 'ml-64' : 'ml-0'}`}>
        <Navbar userName={user?.userName} />
        <main className="p-8">
          <h1 className="text-2xl font-bold mb-4 text-blue-500">即將舉行的演唱會</h1>
          {/* 其他內容，例如演唱會列表 */}
        </main>
      </div>
    </div>
  );
}