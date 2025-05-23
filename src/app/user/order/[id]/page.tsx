"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/navbar/Navbar';
import { Ticket } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import DynamicQRCode from '@/components/tickets/DynamicQRCode';
import TicketHistory from '@/components/tickets/TicketHistory';
import BlockchainVisualizer from '@/components/blockchain/BlockchainVisualizer';
import { formatCurrency, formatDate } from '@/utils/formatters';

interface OrderDetails {
  paymentId: string;
  eventName: string;
  eventDate: string;
  eventLocation?: string;
  purchaseDate: string;
  totalAmount: number;
  paymentMethod?: string;
  tickets: Ticket[];
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const paymentId = params.id;
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showBlockchain, setShowBlockchain] = useState<boolean>(false);

  const fetchOrderDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null); // Reset error state at the beginning of each fetch attempt
      const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      
      // Detect if we're looking at a ticket ID directly (UUIDs are 36 chars) vs. a payment ID
      const isLikelyTicketId = paymentId.length === 36 && paymentId.includes('-');
      
      // For UUID-format IDs, prioritize ticket lookup first
      if (isLikelyTicketId) {
        console.log("ID looks like a ticket ID, trying ticket API first");
        
        try {
          // First, try direct ticket lookup which also handles transferred tickets
          const ticketRes = await fetch(`/api/tickets/${paymentId}`, {
          headers: {
            'Content-Type': 'application/json',
              ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
              'x-user-id': user?.userId || ''
            },
            credentials: 'include'
          });
          
          if (ticketRes.ok) {
            const ticket = await ticketRes.json();
        
            // Create a minimal order details object from the ticket info
            setOrderDetails({
              paymentId: ticket.paymentId || paymentId,
              eventName: ticket.eventName || '未知活動',
              eventDate: ticket.eventDate || '',
              eventLocation: ticket.eventLocation || '',
              purchaseDate: ticket.purchaseDate || '',
              totalAmount: ticket.price || 0,
              paymentMethod: ticket.paymentMethod || '信用卡',
              tickets: [ticket]
            });
            setLoading(false);
            return;
          }
          
          // If status is 403, extract more detailed error
          if (ticketRes.status === 403) {
            const errorData = await ticketRes.json();
            throw new Error(errorData.error || '無權訪問此票券');
          }
        } catch (ticketErr) {
          console.error("Error fetching ticket directly:", ticketErr);
          // Continue to other fallbacks
        }
      }
      
      // Standard payment lookup path
      const res = await fetch(`/api/payments/${paymentId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
          'x-user-id': user?.userId || ''
        },
        credentials: 'include'
      });
      
      // If payment details failed, try fallbacks
      if (!res.ok) {
        console.log("Payment details fetch failed with status", res.status);
        
        // Only proceed with fallbacks if we haven't tried ticket lookup yet
        if (!isLikelyTicketId) {
          // Try to fetch the ticket directly
          const ticketRes = await fetch(`/api/tickets/${paymentId}`, {
            headers: {
              'Content-Type': 'application/json',
              ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
              'x-user-id': user?.userId || ''
            },
            credentials: 'include'
          });
          
          if (ticketRes.ok) {
            const ticket = await ticketRes.json();
            
            // Create a minimal order details object from the ticket info
            setOrderDetails({
              paymentId: ticket.paymentId || paymentId,
              eventName: ticket.eventName || '未知活動',
              eventDate: ticket.eventDate || '',
              eventLocation: ticket.eventLocation || '',
              purchaseDate: ticket.purchaseDate || '',
              totalAmount: 0,
              tickets: [ticket]
            });
            setLoading(false);
            return;
          }
        }
        
        // Try user-specific ticket endpoint as last resort
        if (user?.userId) {
          console.log("Ticket fetch failed, trying user-specific endpoint");
          try {
            const userTicketRes = await fetch(`/api/users/${user.userId}/tickets`, {
              headers: {
                'Content-Type': 'application/json',
                ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
                'x-user-id': user.userId
              },
              credentials: 'include'
            });
            
            if (userTicketRes.ok) {
              const allTickets = await userTicketRes.json();
              // Find the specific ticket we're looking for
              const matchingTicket = allTickets.find((t: Ticket) => t.ticketId === paymentId);
              
              if (matchingTicket) {
                setOrderDetails({
                  paymentId: matchingTicket.paymentId || paymentId,
                  eventName: matchingTicket.eventName || '未知活動',
                  eventDate: matchingTicket.eventDate || '',
                  eventLocation: matchingTicket.eventLocation || '',
                  purchaseDate: matchingTicket.purchaseDate || '',
                  totalAmount: matchingTicket.totalAmount || 0,
                  tickets: [matchingTicket]
                });
                setLoading(false);
                return;
              }
            }
          } catch (userTicketError) {
            console.error("Error with user-specific ticket lookup:", userTicketError);
          }
        }
        
        // All attempts failed, provide specific error based on the original response
        if (res.status === 403) {
          throw new Error('您無權查看此訂單資訊，可能屬於其他用戶');
        } else if (res.status === 404) {
          throw new Error('找不到此訂單或票券，請確認連結是否正確');
        } else {
          throw new Error('無法獲取訂單詳情或轉贈票券資訊，請返回票券列表重新查看');
        }
      }

      const data = await res.json();
      
      const processedData = {
        ...data,
        purchaseDate: data.purchaseDate || new Date().toISOString(),
        eventDate: data.eventDate || 
                  (data.event && data.event.eventDate) || 
                  (data.tickets && data.tickets[0] && data.tickets[0].eventDate) || 
                  null,
        tickets: Array.isArray(data.tickets) ? data.tickets : [],
        // Make sure totalAmount is properly carried through
        totalAmount: data.totalAmount || data.amount || 0,
        paymentMethod: data.paymentMethod || '信用卡'
      };
      
      if (!processedData.eventDate && data.eventId) {
        try {
          const eventRes = await fetch(`/api/events/${data.eventId}`, {
            headers: {
              'Content-Type': 'application/json',
              ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
              'x-user-id': user?.userId || ''
            },
            credentials: 'include'
          });
          
          if (eventRes.ok) {
            const eventData = await eventRes.json();
            if (eventData.eventDate) {
              processedData.eventDate = eventData.eventDate;
              processedData.eventLocation = eventData.location || processedData.eventLocation;
              console.log("Retrieved event date from separate API call:", eventData.eventDate);
            }
          }
        } catch (eventError) {
          console.error('Error fetching event details separately:', eventError);
        }
      }
      
      if (!processedData.tickets.length && data.paymentId) {
        try {
          const ticketsRes = await fetch(`/api/payments/${data.paymentId}/tickets`, {
            headers: {
              'Content-Type': 'application/json',
              ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
              'x-user-id': user?.userId || ''
            },
            credentials: 'include'
          });
          
          if (ticketsRes.ok) {
            const ticketsData = await ticketsRes.json();
            processedData.tickets = Array.isArray(ticketsData) ? ticketsData : [];
          }
        } catch (ticketError) {
          console.error('Error fetching tickets separately:', ticketError);
        }
      }
      
      setOrderDetails(processedData);
    } catch (err) {
      console.error('Error fetching order details:', err);
      setError(err instanceof Error ? err.message : '無法獲取訂單詳情');
    } finally {
      setLoading(false);
    }
  }, [paymentId, user]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(`/user/order/${paymentId}`)}`);
      return;
    }
    
    if (!authLoading && isAuthenticated && user) {
      fetchOrderDetails();
    }
  }, [isAuthenticated, authLoading, user, paymentId, router, fetchOrderDetails]);

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4 pt-20">
        {authLoading ? (
          <div className="flex justify-center items-center py-10">
            <LoadingSpinner size="large" />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 flex justify-between items-center">
              <h1 className="text-2xl font-bold">訂單詳情</h1>
              <Link href="/user/order" className="text-blue-500 hover:text-blue-700">
                ← 返回票券列表
              </Link>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center py-10">
                <LoadingSpinner size="large" />
              </div>
            ) : error ? (
              <div className="p-4 border border-red-200 bg-red-50 text-red-600 rounded-lg mb-6">
                <p>{error}</p>
                <div className="mt-4 flex justify-center">
                  <button 
                    onClick={() => router.push('/user/order')}
                    className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
                  >
                    返回票券列表
                  </button>
                </div>
              </div>
            ) : orderDetails ? (
              <>
                <h2 className="text-xl font-medium mb-4">{orderDetails.eventName}</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                  <div>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">訂單編號：</span> 
                      {orderDetails.paymentId}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">購買時間：</span> 
                      {formatDate(orderDetails.purchaseDate)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">活動時間：</span> 
                      {formatDate(orderDetails.eventDate)}
                    </p>
                    {orderDetails.eventLocation && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">活動地點：</span> 
                        {orderDetails.eventLocation}
                      </p>
                    )}
                  </div>
                </div>
                      
                <div className="p-6 border-b border-gray-100">
                  <h3 className="font-semibold text-lg mb-3">付款詳情</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">付款方式：</span> 
                        {orderDetails.paymentMethod || '信用卡'}
                      </p>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">付款狀態：</span> 
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">已完成</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">總金額</p>
                      <p className="font-semibold text-lg">
                        {/* Only show "免費票券" when we're absolutely sure this is a free ticket */}
                        {orderDetails.totalAmount > 0 
                          ? formatCurrency(orderDetails.totalAmount) 
                          : formatCurrency(0, '免費票券')}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className="font-semibold text-lg mb-3">票券清單</h3>
                  <p className="text-sm text-gray-500 mb-3">共 {orderDetails?.tickets?.length || 0} 張票券</p>
                    
                  {orderDetails?.tickets?.length ? (
                    <div className="space-y-4">
                      {orderDetails.tickets.map((ticket) => (
                        <div key={ticket.ticketId} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            <div>
                              <span className="text-xs text-gray-500">票券編號</span>
                              <p className="font-medium">{ticket.ticketId}</p>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">區域</span>
                              <p className="font-medium">{ticket.zone || '未指定'}</p>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">座位</span>
                              <p className="font-medium">{ticket.seatNumber || '未指定'}</p>
                            </div>
                          </div>
                          
                          <div className="text-center py-8">
                            {ticket.qrCode ? (
                              <div className="mb-4">
                                <DynamicQRCode
                                  ticketId={ticket.ticketId}
                                  initialQrData={ticket.qrCode}
                                  refreshInterval={300}
                                  size={200}
                                  showVerifyInfo={true}
                                />
                                <p className="mt-2 text-sm text-gray-600">請妥善保管您的票券，QR碼會使用區塊鏈技術保護以防偽造</p>
                              </div>
                            ) : (
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="flex justify-center mb-3">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                </div>
                                <p className="text-gray-700 mb-3">此票券的QR碼暫時無法顯示</p>
                                <p className="text-sm text-gray-500 mb-4">可能是系統尚未生成QR碼或發生技術問題</p>
                                <button 
                                  onClick={() => fetchOrderDetails()}
                                  className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                                  >
                                  重新獲取QR碼
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="p-4 bg-gray-50 flex justify-end">
                                  <Link 
                                    href={`/user/tickets/transfer?ticketId=${ticket.ticketId}`}
                              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded transition-colors text-sm"
                                  >
                              轉贈給好友
                                  </Link>
                                </div>
                                
                          <div className="mt-4">
                            <div className="flex items-center mb-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              <span className="text-sm text-gray-600">區塊鏈驗證票券</span>
                            </div>
                            <p className="text-xs text-gray-500 mb-3">
                              此票券使用區塊鏈技術記錄所有交易，確保票券真實性和防止偽造。
                              {ticket.transferredAt && (
                                <span className="block mt-1 text-blue-600">
                                  此票券於 {formatDate(ticket.transferredAt)} 被轉讓
                                </span>
                              )}
                            </p>
                          
                            <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTicket(ticket.ticketId);
                                setShowHistory(!showHistory);
                              }}
                              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                            >
                              {showHistory && selectedTicket === ticket.ticketId ? '隱藏交易歷史' : '查看交易歷史'}
                              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ml-1 transition-transform ${
                                showHistory && selectedTicket === ticket.ticketId ? 'rotate-180' : ''
                              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                              
                              <button
                                onClick={() => setShowBlockchain(!showBlockchain)}
                                className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                              >
                                查看區塊鏈視圖
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {showHistory && selectedTicket === ticket.ticketId && (
                            <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                              <h4 className="text-sm font-medium text-gray-700 mb-3">票券交易歷史</h4>
                              <div className="text-xs text-gray-600 mb-3">
                                每筆交易均使用密碼學簽名並記錄在分散式區塊鏈上，確保票券資料不可篡改
                              </div>
                              
                              {/* 交易歷史組件 */}
                              <TicketHistory 
                                ticketId={ticket.ticketId} 
                                isAdminView={false} 
                                emptyMessage="此票券尚無交易歷史記錄。初始交易將在首次使用時記錄。" 
                              />
                              </div>
                          )}
                              
                              {/* 區塊鏈可視化 */}
                              {showBlockchain && (
                            <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                              <h4 className="text-sm font-medium text-gray-700 mb-3">區塊鏈視圖</h4>
                                  <BlockchainVisualizer ticketId={ticket.ticketId} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">沒有找到票券資料。請聯繫客服獲取幫助。</p>
                    </div>
                  )}
                </div>
                
                <div className="p-6 bg-gray-50 border-t border-gray-100">
                  <div className="flex flex-wrap gap-3 justify-end">
                    <button 
                      className="px-4 py-2 border border-gray-300 rounded text-gray-600 hover:bg-gray-100"
                      onClick={() => window.print()}
                    >
                      列印票券
                    </button>
                    {/* Add more action buttons here if needed */}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white p-6 rounded-lg shadow-md text-center py-12">
                <p className="text-lg text-gray-600 mb-4">找不到訂單詳情</p>
                <button 
                  onClick={() => router.push('/user/order')}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                >
                  返回票券列表
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
