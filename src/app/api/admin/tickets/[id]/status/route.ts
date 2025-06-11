import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }>}
) {
  try {
    const currentUser = await getCurrentUser(request);
    const isTicketCheckerHeaderPresent = !!request.headers.get('x-ticket-checker');

    if (!currentUser || (currentUser.role !== 'admin' && !isTicketCheckerHeaderPresent)) {
      return NextResponse.json(
        { error: '無權限執行此操作' },
        { status: 403 }
      );
    }
    
    const ticketId = (await params).id;
    const { status, usageTimestamp } = await request.json();
    
    // Validate the status
    if (!['sold', 'used', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { error: '無效的票券狀態' },
        { status: 400 }
      );
    }
    
    // Get the existing ticket
    const ticket = await db.tickets.findById(ticketId);
    if (!ticket) {
      return NextResponse.json(
        { error: '找不到票券' },
        { status: 404 }
      );
    }
interface TicketUpdate {
  status: 'sold' | 'used' | 'cancelled';
  verificationInfo?: {
    verificationStatus: string;
    lastVerified: string;
    usageTimestamp: string;
    verificationCount: number;
    verifiedBy: string;
    verifierName: string;
    isTransferred?: boolean;
    originalOwner?: string | null;
    adminNotes?: string | null;
  };
}
    // Prepare update data
    const updateData: TicketUpdate = { status };
    
    // If the status is 'used', update the verification info
    if (status === 'used') {
      const now = new Date().toISOString();
      const timestamp = usageTimestamp ? usageTimestamp.toString() : Date.now().toString();
      
      updateData.verificationInfo = {
        ...ticket.verificationInfo,
        verificationStatus: 'used',
        lastVerified: now,
        usageTimestamp: timestamp,
        verificationCount: (ticket.verificationInfo?.verificationCount || 0) + 1,
        verifiedBy: currentUser.userId,
        verifierName: currentUser.userName || 'Administrator'
      };
    }
    
    // Update the ticket
    await db.tickets.update(ticketId, updateData);
    
    // Log status change for real-time tracking
    console.log(`Ticket ${ticketId} status updated to ${status} by admin ${currentUser.userId} at ${new Date().toISOString()}`);
    
    // If marking as used, also log to audit trail
    if (status === 'used') {
      await db.ticketAudit.log({
        ticketId,
        userId: currentUser.userId,
        action: 'admin_verify',
        timestamp: new Date().toISOString(),
        details: `Admin ${currentUser.userName || currentUser.userId} marked ticket as used`,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userRole: 'Admin'
      });
    }
    
    const response = NextResponse.json({
      success: true,
      message: `票券狀態已更新為 ${status}`,
      usageTimestamp: updateData.verificationInfo?.usageTimestamp || null,
      timestamp: Date.now() // Add server timestamp for client sync
    });
    
    // Add headers to bust any cached data
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('X-Status-Updated', 'true');
    response.headers.set('X-Update-Timestamp', Date.now().toString());
    
    return response;
  } catch (error) {
    console.error('Error updating ticket status:', error);
    return NextResponse.json(
      { error: '更新票券狀態時發生錯誤', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}