import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { verifyTicket,recordTicketUsage } from '@/lib/blockchain';
import { DynamicTicketData } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ticketId = (await params).id;
    // Get request ID from header for tracing this verification attempt
    const requestId = request.headers.get('x-request-id') || `auto-${Date.now()}`;
    
    console.log(`[${requestId}] Processing verification request for ticket ${ticketId}`);
    
    // Allow public ticket verification without authentication
    // but require admin/checker for marking as used
    const user = await getCurrentUser(request);
    const isTicketChecker = !!request.headers.get('x-ticket-checker');
    const canUseTicket = user?.role === 'admin' || isTicketChecker;
    
    // 獲取請求體中的QR碼數據
    const requestData = await request.json();
    let qrData = requestData.qrData as DynamicTicketData | string;
    const checkOnly = !!requestData.checkOnly; // New parameter to just check without marking as used
    const clientTimestamp = requestData.timestamp || Date.now(); // Get client timestamp
    
    // Parse QR data if it's a string that looks like JSON
    if (typeof qrData === 'string' && (qrData.startsWith('{') || qrData.startsWith('['))) {
      try {
        qrData = JSON.parse(qrData);
      } catch (e) {
        console.error('Failed to parse QR data JSON:', e);
        return NextResponse.json(
          { error: 'QR碼數據格式無效' },
          { status: 400 }
        );
      }
    }
    
    // At this point qrData should be an object, either parsed or from the original request
    // Validate that we have the necessary ticket ID, either in the dynamic data or directly
    const ticketIdFromQR = typeof qrData === 'object' && qrData !== null && 'ticketId' in qrData
      ? (qrData as DynamicTicketData).ticketId
      : null;
    
    if (!ticketIdFromQR) {
      return NextResponse.json(
        { error: '無效的QR碼數據 - 缺少票券ID' },
        { status: 400 }
      );
    }
    
    // Check if ticketId in URL matches QR data
    if (ticketIdFromQR !== ticketId) {
      console.warn(`Ticket ID mismatch: URL=${ticketId}, QR=${ticketIdFromQR}`);
      // Continue with the ticket ID from QR code as it's the source of truth
    }
    
    // 獲取票券信息
    const ticket = await db.tickets.findById(ticketIdFromQR);
    if (!ticket) {
      return NextResponse.json(
        { error: '找不到該票券', ticketId: ticketIdFromQR },
        { status: 404 }
      );
    }
    
    // Log ticket details for debugging
    console.log(`Verifying ticket [${ticketId}]:`, { 
      status: ticket.status,
      verificationInfo: ticket.verificationInfo || 'none',
      dynamicData: ticket.dynamicData ? 'present' : 'missing'
    });
    
    // 驗證票券狀態
    if (ticket.status === 'used') {
      // Add improved debugging information
      console.log(`[${requestId}] Ticket [${ticketId}] state check - status is already 'used'`);
      
      // Check if there might be a clock synchronization issue
      const usageTimestamp = ticket.verificationInfo?.usageTimestamp 
        ? (typeof ticket.verificationInfo.usageTimestamp === 'string' 
            ? parseInt(ticket.verificationInfo.usageTimestamp, 10) 
            : ticket.verificationInfo.usageTimestamp) 
        : null;
      
      const now = Date.now();
      
      // Look for suspicious timestamps that could indicate wrong system clocks
      const isFutureTimestamp = usageTimestamp && usageTimestamp > now + (5 * 60 * 1000); // 5 min in future
      
      if (isFutureTimestamp) {
        console.warn(`[${requestId}] Suspicious future timestamp detected: ${new Date(usageTimestamp).toISOString()}, current time: ${new Date(now).toISOString()}`);
        
        // For suspicious future dates, normalize to current time in response
        const normalizedTime = now;
        return NextResponse.json({
          verified: false,
          status: ticket.status,
          message: '此票券已被使用',
          details: {
            usedAt: new Date(normalizedTime).toISOString(),
            originalTimestamp: usageTimestamp,
            correctedTimestamp: normalizedTime,
            ticketId: ticket.ticketId,
            eventName: ticket.eventName,
            userName: ticket.userRealName || '未提供姓名',
            zone: ticket.zone,
            hasSuspiciousFutureDate: true
          }
        });
      }
      
      // Normal case for already used tickets - use the most reliable timestamp source
      const usageTime = ticket.verificationInfo?.lastVerified || 
                      (usageTimestamp ? new Date(usageTimestamp).toISOString() : null);
                        
      const usageDetails = {
        usedAt: usageTime,
        usageTimestamp: usageTimestamp,
        verificationCount: ticket.verificationInfo?.verificationCount || 1,
        ticketId: ticket.ticketId,
        eventName: ticket.eventName,
        userName: ticket.userRealName || '未提供姓名',
        zone: ticket.zone
      };
      
      console.log(`[${requestId}] Ticket [${ticketId}] is already used:`, usageDetails);
      
      return NextResponse.json({
        verified: false,
        status: ticket.status,
        message: '此票券已被使用',
        details: usageDetails
      });
    }
    
    if (ticket.status === 'cancelled') {
      return NextResponse.json({
        verified: false,
        status: ticket.status,
        message: '此票券已被取消',
      });
    }
    
    // 使用區塊鏈驗證QR碼 - directly use the ticket data or fallback to simple validation
    let verificationResult;
    try {
      verificationResult = verifyTicket(qrData);
      console.log(`Blockchain verification for ticket [${ticketId}]:`, verificationResult);
      
      // CRITICAL: Check verification result validity - reject expired QR codes
      if (!verificationResult.valid) {
        return NextResponse.json({
          verified: false,
          status: ticket.status,
          message: verificationResult.message || '票券驗證失敗',
          expired: verificationResult.message?.includes('過期') || verificationResult.message?.includes('expired'),
          details: {
            ticketId: ticketIdFromQR,
            eventName: ticket.eventName,
            userName: ticket.userRealName || '未提供姓名',
            zone: ticket.zone,
            verificationMessage: verificationResult.message
          }
        });
      }
      
      // Check if the ticket has already been used according to blockchain
      if (verificationResult.used) {
        return NextResponse.json({
          verified: false,
          status: 'used',
          message: '此票券已被使用',
          details: {
            usedAt: verificationResult.usageTime ? new Date(verificationResult.usageTime).toISOString() : null,
            ticketId: ticketIdFromQR,
            eventName: ticket.eventName,
            userName: ticket.userRealName || '未提供姓名',
            zone: ticket.zone
          }
        });
      }
    } catch (error) {
      console.warn('Blockchain verification failed, fallback to basic verification:', error);
      // Fallback to basic verification - if the ticket exists and is active, consider it valid
      verificationResult = { valid: ticket.status === 'sold' || ticket.status === 'available', used: false };
    }
    
    // 如果要驗證並使用票券
    if (verificationResult.valid && requestData.useTicket && canUseTicket && !checkOnly) {
      // Log the operation with request ID for tracing
      console.log(`[${requestId}] Marking ticket [${ticketId}] as used by user ${user?.userId || 'public-verification'}`);
      
      const now = new Date();
      const usageTimestamp = now.getTime();
      const isoNow = now.toISOString();

      // Create verification info with consistent timestamp formats
      const verificationInfo = {
        verificationStatus: 'used',
        lastVerified: isoNow,
        usageTimestamp: usageTimestamp.toString(),
        verificationCount: (ticket.verificationInfo?.verificationCount || 0) + 1,
        isTransferred: ticket.verificationInfo?.isTransferred ?? false,
        originalOwner: ticket.verificationInfo?.originalOwner ?? null,
        adminNotes: ticket.verificationInfo?.adminNotes ?? null,
        // Add tracking information
        verifiedBy: user?.userId || 'public-verification',
        verifierName: user?.userName || 'System',
        location: requestData.location || 'Unknown',
        requestId: requestId,
        clientRequestTime: clientTimestamp
      };
      
      // Use the updated recordTicketUsage function which returns the usage time
      const usageResult = recordTicketUsage(ticketIdFromQR, ticket.eventId);
      
      // Double-check the ticket hasn't been used in the meantime (avoid race conditions)
      const currentTicket = await db.tickets.findById(ticketIdFromQR);
      if (currentTicket && currentTicket.status === 'used') {
        console.log(`Race condition detected: Ticket [${ticketId}] was marked as used by another process`);
        
        const existingUsageTime = currentTicket.verificationInfo?.lastVerified || 
                                (currentTicket.verificationInfo?.usageTimestamp 
                                  ? new Date(Number(currentTicket.verificationInfo.usageTimestamp)).toISOString() 
                                  : null);
                                  
        return NextResponse.json({
          verified: false,
          status: 'used',
          message: '此票券已被其他處理程序使用',
          details: {
            usedAt: existingUsageTime,
            ticketId: ticketIdFromQR,
            eventName: ticket.eventName,
            userName: ticket.userRealName || '未提供姓名',
            zone: ticket.zone
          }
        });
      }
      
      // 更新票券狀態為已使用，并保存验证信息
      console.log(`[${requestId}] Updating ticket status to 'used' with timestamp ${isoNow}`);
      
      await db.tickets.update(ticketIdFromQR, {
        status: 'used',
        verificationInfo
      });
      
      return NextResponse.json({
        verified: true,
        status: 'used',
        message: '票券驗證成功並已標記為已使用',
        usedAt: isoNow,
        usageTimestamp: usageTimestamp,
        requestId: requestId,
        serverTime: isoNow,
        blockchainTimestamp: usageResult.usageTime
      });
    }
    
    // 只驗證但不使用
    return NextResponse.json({
      verified: verificationResult.valid,
      status: ticket.status,
      message: verificationResult.valid ? '票券驗證成功' : verificationResult.message || '無效的票券數據，可能是偽造的',
      ticket: verificationResult.valid ? {
        eventName: ticket.eventName,
        eventDate: ticket.eventDate,
        zone: ticket.zone,
        seatNumber: ticket.seatNumber,
        userRealName: ticket.userRealName || '未提供姓名'
      } : null
    });
  } catch (error) {
    console.error('Error verifying ticket:', error);
    return NextResponse.json(
      { error: '驗證票券時出錯', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
