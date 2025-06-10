"use client";

import { useEffect, useReducer, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import AdminPage from '@/components/admin/AdminPage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import { adminFetch } from '@/utils/adminApi'; // Assuming you have this utility
import { formatDate } from '@/utils/formatters'; // Import the new formatter

// Define Ticket type (adjust based on your actual ticket structure)
interface Ticket {
  ticketId: string; // Changed from id to ticketId
  status: 'available' | 'sold' | 'used' | 'cancelled' | string; // More flexible status
  eventName?: string;
  userRealName?: string; // Changed from userName to userRealName
  seatNumber?: string; // Changed from seatInfo to seatNumber
  price?: string; // Changed from number to string
  purchaseDate?: string;
  // ... other properties
}

// State Machine Definition
type VerifyPageState =
  | { name: 'loadingInitial' }
  | { name: 'errorInitial'; message: string }
  | { name: 'idle'; ticket: Ticket; successMessage?: string; errorMessage?: string }
  | { name: 'verifying'; ticket: Ticket; action: 'markUsed' | 'cancelTicket' }
  | { name: 'verified'; ticket: Ticket; successMessage: string } // State after successful action
  | { name: 'errorVerifying'; ticket: Ticket; errorMessage: string }; // State after failed action

type VerifyPageAction =
  | { type: 'FETCH_TICKET_START' }
  | { type: 'FETCH_TICKET_SUCCESS'; payload: Ticket }
  | { type: 'FETCH_TICKET_ERROR'; payload: string }
  | { type: 'MARK_AS_USED_START'; payload: Ticket }
  | { type: 'CANCEL_TICKET_START'; payload: Ticket }
  | { type: 'VERIFY_ACTION_SUCCESS'; payload: { ticket: Ticket; message: string } }
  | { type: 'VERIFY_ACTION_ERROR'; payload: { ticket: Ticket; message: string } }
  | { type: 'DISMISS_MESSAGE'; payload: Ticket };

const initialState: VerifyPageState = { name: 'loadingInitial' };

function verifyPageReducer(state: VerifyPageState, action: VerifyPageAction): VerifyPageState {
  switch (action.type) {
    case 'FETCH_TICKET_START':
      return { name: 'loadingInitial' };
    case 'FETCH_TICKET_SUCCESS':
      return { name: 'idle', ticket: action.payload };
    case 'FETCH_TICKET_ERROR':
      return { name: 'errorInitial', message: action.payload };
    case 'MARK_AS_USED_START':
      return { name: 'verifying', ticket: action.payload, action: 'markUsed' };
    case 'CANCEL_TICKET_START':
      return { name: 'verifying', ticket: action.payload, action: 'cancelTicket' };
    case 'VERIFY_ACTION_SUCCESS':
      // Update ticket status in the state if the backend returns the updated ticket
      return { name: 'verified', ticket: action.payload.ticket, successMessage: action.payload.message };
    case 'VERIFY_ACTION_ERROR':
      return { name: 'errorVerifying', ticket: action.payload.ticket, errorMessage: action.payload.message };
    case 'DISMISS_MESSAGE':
      // Return to idle state with the current ticket, clearing messages
      return { name: 'idle', ticket: action.payload };
    default:
      return state;
  }
}

export default function AdminTicketVerifyPage() {
  const { id: ticketId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const quickMode = searchParams?.get('quick') === 'true';

  const [state, dispatch] = useReducer(verifyPageReducer, initialState);
  const isAuthenticated = !!user; // Simplified check - Moved declaration up

  // Authentication and Authorization
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push(`/login?redirect=/admin/tickets/verify/${ticketId}${quickMode ? '?quick=true' : ''}`);
      } else if (!isAdmin) {
        router.push('/admin'); // Or some other appropriate page
      }
    }
  }, [authLoading, isAuthenticated, isAdmin, router, ticketId, quickMode]);

  // Fetch ticket details
  const fetchTicketDetails = useCallback(async () => {
    if (!ticketId || !isAdmin) return;

    dispatch({ type: 'FETCH_TICKET_START' });
    try {
      const fetchedTicket = await adminFetch<Ticket>(`/api/admin/tickets/${ticketId}`);
      dispatch({ type: 'FETCH_TICKET_SUCCESS', payload: fetchedTicket });
    } catch (err) {
      console.error('Error fetching ticket:', err);
      dispatch({ type: 'FETCH_TICKET_ERROR', payload: err instanceof Error ? err.message : '無法獲取票券資料' });
    }
  }, [ticketId, isAdmin]);

  useEffect(() => {
    if (isAdmin && ticketId) {
      fetchTicketDetails();
    }
  }, [isAdmin, ticketId, fetchTicketDetails]);

  const handleTicketAction = async (actionType: 'markUsed' | 'cancelTicket') => {
    if (state.name !== 'idle' && state.name !== 'verified' && state.name !== 'errorVerifying') return;
    
    // Refined type access for currentTicket
    let currentTicket: Ticket | undefined;
    if ('ticket' in state && state.ticket) {
      currentTicket = state.ticket;
    }
    
    if (!currentTicket) return;

    const confirmMessage = actionType === 'markUsed'
      ? '確定要將此票券標記為已使用 (確認入場) 嗎？'
      : '確定要取消此票券嗎？此操作可能無法撤銷。';

    if (!confirm(confirmMessage)) {
      return;
    }

    if (actionType === 'markUsed') {
      dispatch({ type: 'MARK_AS_USED_START', payload: currentTicket });
    } else {
      dispatch({ type: 'CANCEL_TICKET_START', payload: currentTicket });
    }

    try {
      const endpoint = actionType === 'markUsed' ? `/api/admin/tickets/${currentTicket.ticketId}/use` : `/api/admin/tickets/${currentTicket.ticketId}/cancel`; // Changed currentTicket.id to currentTicket.ticketId
      const updatedTicket = await adminFetch<Ticket>(endpoint, { method: 'PATCH' });
      
      dispatch({ 
        type: 'VERIFY_ACTION_SUCCESS', 
        payload: { 
          ticket: updatedTicket, 
          message: actionType === 'markUsed' ? '票券已成功標記為已使用！' : '票券已成功取消！'
        } 
      });

      if (quickMode && actionType === 'markUsed') {
        setTimeout(() => router.push('/admin/tickets/scan?quick=true'), 1500);
      }

    } catch (err) {
      console.error(`Error ${actionType === 'markUsed' ? 'marking as used' : 'cancelling ticket'}:`, err);
      dispatch({ 
        type: 'VERIFY_ACTION_ERROR', 
        payload: { 
          ticket: currentTicket, // Keep original ticket data on error
          message: err instanceof Error ? err.message : `處理票券時發生錯誤` 
        }
      });
    }
  };
  
  const markAsUsed = () => handleTicketAction('markUsed');
  const cancelTicket = () => handleTicketAction('cancelTicket');

  const renderContent = () => {
    switch (state.name) {
      case 'loadingInitial':
        return <div className="flex justify-center items-center p-10"><LoadingSpinner /></div>;
      case 'errorInitial':
        return <div className="text-red-500 p-4 text-center">{state.message}</div>;
      case 'idle':
      case 'verifying':
      case 'verified':
      case 'errorVerifying':
        const ticket = state.ticket;
        const isLoadingAction = state.name === 'verifying';
        const successMessage = state.name === 'verified' ? state.successMessage : (state.name === 'idle' && state.successMessage ? state.successMessage : undefined);
        const errorMessage = state.name === 'errorVerifying' ? state.errorMessage : (state.name === 'idle' && state.errorMessage ? state.errorMessage : undefined);

        if (!ticket) return <div className="text-red-500 p-4 text-center">票券資料遺失。</div>; // Should not happen if logic is correct

        return (
          <div>
            {successMessage && (
              <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded-md">
                {successMessage}
                <button onClick={() => dispatch({ type: 'DISMISS_MESSAGE', payload: ticket })} className="ml-2 text-green-600 font-bold">關閉</button>
              </div>
            )}
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
                {errorMessage}
                <button onClick={() => dispatch({ type: 'DISMISS_MESSAGE', payload: ticket })} className="ml-2 text-red-600 font-bold">關閉</button>
              </div>
            )}

            <h2 className="text-xl sm:text-2xl font-semibold mb-2 text-gray-800">{ticket.eventName || '票券詳情'}</h2>
            <p className="text-sm text-gray-500 mb-4">票券ID: {ticket.ticketId.substring(0, 8)}...</p> {/* Changed ticket.id to ticket.ticketId */}
            
            <div className="space-y-3 text-sm sm:text-base">
              <InfoRow label="狀態" value={ticket.status} badgeColor={getStatusBadgeColor(ticket.status)} />
              <InfoRow label="用戶" value={ticket.userRealName || 'N/A'} /> {/* Changed ticket.userName to ticket.userRealName */}
              <InfoRow label="座位資訊" value={ticket.seatNumber || 'N/A'} /> {/* Changed ticket.seatInfo to ticket.seatNumber */}
              <InfoRow label="價格" value={ticket.price ? `HK$ ${ticket.price}` : 'N/A'} />
              <InfoRow label="購買日期" value={ticket.purchaseDate ? formatDate(ticket.purchaseDate) : 'N/A'} /> {/* Use new formatter */}
            </div>

            <div className={`mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200 ${quickMode ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 sm:flex sm:flex-wrap gap-3 sm:gap-4'}`}>
              {(ticket.status === 'available' || ticket.status === 'sold') && (
                <button
                  onClick={markAsUsed}
                  disabled={isLoadingAction}
                  className={`px-4 py-3 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-medium rounded-lg text-center ${quickMode ? 'w-full' : 'sm:flex-1'} ${isLoadingAction ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isLoadingAction && state.action === 'markUsed' ? '處理中...' : '確認入場'}
                </button>
              )}
              
              {!quickMode && (ticket.status === 'available' || ticket.status === 'sold') && (
                <button
                  onClick={cancelTicket}
                  disabled={isLoadingAction}
                  className={`px-4 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg text-center ${isLoadingAction ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isLoadingAction && state.action === 'cancelTicket' ? '處理中...' : '取消票券'}
                </button>
              )}
               {ticket.status === 'used' && !quickMode && (
                 <p className="text-green-600 font-semibold text-center sm:text-left w-full">此票券已使用</p>
               )}
               {ticket.status === 'cancelled' && !quickMode && (
                 <p className="text-red-600 font-semibold text-center sm:text-left w-full">此票券已取消</p>
               )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <AdminPage title="票券驗證" isLoading={authLoading || state.name === 'loadingInitial'} backLink={quickMode ? "/admin/tickets/scan?quick=true" : "/admin/tickets"}>
      <div className={`bg-white rounded-lg shadow p-3 sm:p-6 ${quickMode ? 'max-w-md mx-auto' : ''}`}>
        {renderContent()}
      </div>
    </AdminPage>
  );
}

// Helper component for displaying info
const InfoRow = ({ label, value, badgeColor }: { label: string; value: string | number; badgeColor?: string }) => (
  <div className="flex justify-between items-center py-1">
    <span className="text-gray-600 font-medium">{label}:</span>
    {badgeColor ? (
      <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${badgeColor}`}>
        {value}
      </span>
    ) : (
      <span className="text-gray-800">{value}</span>
    )}
  </div>
);

// Helper function for status badge color
const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'available': return 'bg-blue-100 text-blue-800';
    case 'sold': return 'bg-green-100 text-green-800';
    case 'used': return 'bg-yellow-100 text-yellow-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};
