import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET ticket by ID
 * Permissions: 
 * - Ticket owner can access their ticket
 * - Admin can access any ticket
 * - Event organizers can access tickets for their events (future enhancement)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise <{ id: string }> }
) {
  try {
    const ticketId = (await params).id;
    
    if (!ticketId) {
      return NextResponse.json(
        { error: '必須提供票券ID' }, 
        { status: 400 }
      );
    }

    // 獲取用戶身份 - 嘗試多種認證方式
    const user = await getCurrentUser(request);
    const headerUserId = request.headers.get('x-user-id');
    const queryUserId = new URL(request.url).searchParams.get('userId');
    const userIdToUse = user?.userId || headerUserId || queryUserId;
    
    // 獲取票券信息
    const ticket = await db.tickets.findById(ticketId);
    if (!ticket) {
      return NextResponse.json(
        { error: '找不到該票券' },
        { status: 404 }
      );
    }

    // 驗證訪問權限
    // 以下用戶可以訪問票券信息:
    // 1. 管理員
    // 2. 票券持有者
    // 3. 票券檢查員 (通過特殊標頭識別)
    const isAdmin = user?.role === 'admin';
    const isOwner = userIdToUse === ticket.userId;
    const isTicketChecker = request.headers.get('x-ticket-checker') === 'true';
    
    if (!isAdmin && !isOwner && !isTicketChecker) {
      console.log('Ticket access denied:', { 
        ticketId,
        ticketOwnerId: ticket.userId,
        requestUserId: userIdToUse,
        isAdmin,
        headerUserId: headerUserId || 'none'
      });
      
      return NextResponse.json(
        { 
          error: '無權訪問此票券資訊',
          code: 'FORBIDDEN',
          message: '您必須是票券持有者或管理員才能查看此信息' 
        },
        { status: 403 }
      );
    }

    // 增強票券數據以便客戶端使用
    const enhancedTicket = {
      ...ticket,
      // 添加前端可能需要的任何附加信息
      formattedPurchaseDate: ticket.purchaseDate ? new Date(ticket.purchaseDate).toLocaleString() : undefined,
      formattedEventDate: ticket.eventDate ? new Date(ticket.eventDate).toLocaleString() : undefined,
      
      // 管理員和票券檢查員的額外數據
      verificationInfo: (isAdmin || isTicketChecker) ? {
        verificationStatus: ticket.status === 'used' ? 'used' : 'valid',
        lastVerified: ticket.lastVerified || null,
        verificationCount: ticket.verificationCount || 0,
        isTransferred: !!ticket.transferredFrom,
        originalOwner: ticket.transferredFrom || null,
        adminNotes: ticket.adminNotes || null,
      } : undefined,
      
      // 標記此請求是來自管理員還是檢票員
      _requestSource: isAdmin ? 'admin' : (isTicketChecker ? 'ticketChecker' : 'user'),
      
      // 添加驗證連結 - 僅提供給管理員和票務檢查人員
      _verificationLinks: (isAdmin || isTicketChecker) ? {
        // 直接驗證連結 (帶有預授權令牌)
        verifyUrl: `/admin/tickets/verify/${ticketId}?token=${generateVerificationToken(ticketId, userIdToUse)}`,
        
        // 更改狀態的API端點
        markAsUsedApi: `/api/admin/tickets/${ticketId}/status?action=use`,
        markAsCancelledApi: `/api/admin/tickets/${ticketId}/status?action=cancel`,
        
        // QR碼掃描後重定向URL (帶有來源標記)
        qrRedirectUrl: `/admin/tickets/verify/${ticketId}?source=qr&redirect=true`,
        
        // 檢查歷史記錄
        historyUrl: `/admin/tickets/${ticketId}/history`
      } : undefined
    };

    // 記錄票券訪問記錄（僅限管理員和票券檢查員）
    if (isAdmin || isTicketChecker) {
      try {
        await db.ticketAudit?.log?.({
          ticketId,
          action: 'view',
          userId: userIdToUse || 'unknown',
          userRole: isAdmin ? 'admin' : (isTicketChecker ? 'ticketChecker' : 'user'),
          timestamp: new Date().toISOString(),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
        });
      } catch (auditError) {
        console.error('Failed to log ticket audit:', auditError);
        // Continue with the response even if audit logging fails
      }
    }

    return NextResponse.json(enhancedTicket);
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { 
        error: '獲取票券詳情時出錯', 
        details: error instanceof Error ? error.message : '發生未知錯誤' 
      },
      { status: 500 }
    );
  }
}

/**
 * 生成用於票券驗證的臨時令牌
 * 注意：實際生產環境應使用更安全的方法，如 JWT
 */
function generateVerificationToken(ticketId: string, userId: string | null | undefined): string {
  // 簡單令牌生成 - 生產環境應使用適當的加密和簽名
  const timestamp = Date.now();
  const randomComponent = Math.random().toString(36).substring(2, 15);
  
  // 在實際應用中，可以使用 JWT 或其他安全機制
  return Buffer.from(`${ticketId}-${userId || 'anon'}-${timestamp}-${randomComponent}`).toString('base64');
}
