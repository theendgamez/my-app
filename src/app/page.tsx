//app/page.tsx
import Navbar from "./components/Navber";


export default function Home() {
  return (
    <div>
      <Navbar />
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-4 text-blue-500">即將舉行的演唱會</h1>
        {/* 其他內容，例如演唱會列表 */}ad
      </main>
    </div>
  );
}
