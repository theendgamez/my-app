import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ticketBlockchain, verifyTicket } from '@/lib/blockchain';
import { DynamicTicketData } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ticketId = (await params).id;
    const user = await getCurrentUser(request);
    
    // 驗證是否為管理員或檢票人員
    if (!user || (user.role !== 'admin' && !request.headers.get('x-ticket-checker'))) {
      return NextResponse.json(
        { error: '無權驗證票券' },
        { status: 403 }
      );
    }
    
    // 獲取請求體中的QR碼數據
    const requestData = await request.json();
    const qrData = requestData.qrData as DynamicTicketData;
    
    if (!qrData || !qrData.ticketId || qrData.ticketId !== ticketId) {
      return NextResponse.json(
        { error: '無效的QR碼數據' },
        { status: 400 }
      );
    }
    
    // 獲取票券信息
    const ticket = await db.tickets.findById(ticketId);
    if (!ticket) {
      return NextResponse.json(
        { error: '找不到該票券' },
        { status: 404 }
      );
    }
    
    // 驗證票券狀態
    if (ticket.status === 'used') {
      return NextResponse.json({
        verified: false,
        status: ticket.status,
        message: '此票券已被使用',
      });
    }
    
    if (ticket.status === 'cancelled') {
      return NextResponse.json({
        verified: false,
        status: ticket.status,
        message: '此票券已被取消',
      });
    }
    
    // 使用區塊鏈驗證QR碼
    const isValid = verifyTicket(qrData);
    
    // 如果要驗證並使用票券
    if (isValid && requestData.useTicket) {
      // 記錄使用交易
      ticketBlockchain.addTransaction({
        ticketId,
        timestamp: Date.now(),
        action: 'use',
        eventId: ticket.eventId,
        toUserId: user.userId // 檢票人員ID
      });
      
      // 處理待處理的交易
      ticketBlockchain.processPendingTransactions();
      
      // 更新票券狀態為已使用
      await db.tickets.updateStatus(ticketId, 'used');
      
      return NextResponse.json({
        verified: true,
        status: 'used',
        message: '票券驗證成功並已標記為已使用',
        usedAt: new Date().toISOString()
      });
    }
    
    // 只驗證但不使用
    return NextResponse.json({
      verified: isValid,
      status: ticket.status,
      message: isValid ? '票券驗證成功' : '無效的票券數據，可能是偽造的',
      ticket: isValid ? {
        eventName: ticket.eventName,
        eventDate: ticket.eventDate,
        zone: ticket.zone,
        seatNumber: ticket.seatNumber,
        userRealName: ticket.userRealName
      } : null
    });
  } catch (error) {
    console.error('Error verifying ticket:', error);
    return NextResponse.json(
      { error: '驗證票券時出錯' },
      { status: 500 }
    );
  }
}
