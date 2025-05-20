import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/db';
import dynamicTicket from '@/utils/dynamicTicket';

// Define the DynamicTicketData interface


// Define the Ticket interface to include dynamicData

const TICKET_SECRET_KEY = process.env.TICKET_SECRET_KEY ?? '';

if (!TICKET_SECRET_KEY) {
  throw new Error('TICKET_SECRET_KEY is not defined in environment variables');
}

export async function POST(request: NextRequest) {
  try {
    // 驗證管理員身份
    const user = await getCurrentUser(request);
    
    // 同時檢查頭部認證作為備用
    const userIdHeader = request.headers.get('x-user-id');
    let isAdmin = false;

    if (user && user.role === 'admin') {
      isAdmin = true;
    } else if (userIdHeader) {
      try {
        const dbUser = await db.users.findById(userIdHeader);
        if (dbUser?.role === 'admin') {
          isAdmin = true;
        }
      } catch (error) {
        console.error('Error verifying admin via user ID:', error);
      }
    }

    if (!isAdmin) {
      return NextResponse.json(
        { error: '僅管理員可驗證票券' },
        { status: 403 }
      );
    }

    // 獲取請求數據
    const { qrData } = await request.json();
    
    if (!qrData) {
      return NextResponse.json(
        { error: '缺少QR碼數據' },
        { status: 400 }
      );
    }

    // 解析QR碼數據
    let parsedData;
    try {
      const decodedData = Buffer.from(qrData, 'base64').toString();
      parsedData = JSON.parse(decodedData);
    } catch  {
      return NextResponse.json(
        { error: 'QR碼格式無效' },
        { status: 400 }
      );
    }

    if (!parsedData.id) {
      return NextResponse.json(
        { error: 'QR碼缺少票券ID' },
        { status: 400 }
      );
    }

    // 獲取票券信息
    const ticket = await db.tickets.findById(parsedData.id);
    if (!ticket) {
      return NextResponse.json(
        { error: '找不到該票券' },
        { status: 404 }
      );
    }

    // 檢查票券狀態
    if (ticket.status === 'used') {
      return NextResponse.json(
        { error: '此票券已被使用', ticketDetails: ticket },
        { status: 400 }
      );
    }

    if (ticket.status === 'cancelled') {
      return NextResponse.json(
        { error: '此票券已被作廢', ticketDetails: ticket },
        { status: 400 }
      );
    }

    // 驗證動態QR碼
    if (!ticket.dynamicData) {
      return NextResponse.json(
        { error: '票券缺少動態驗證資料', ticketDetails: ticket },
        { status: 400 }
      );
    }

    // 檢查時間戳（票券刷新時間不應過久，假設30分鐘內有效）
    const maxValidTime = 30 * 60 * 1000; // 30分鐘（毫秒）
    const ticketTimestamp = Number(ticket.dynamicData.timestamp);
    const now = Date.now();
    
    if (now - ticketTimestamp > maxValidTime) {
      return NextResponse.json({
        error: '票券QR碼已過期，請要求用戶刷新',
        expired: true,
        ticketDetails: {
          ticketId: ticket.ticketId,
          eventName: ticket.eventName,
          userName: ticket.userRealName,
          status: ticket.status,
          lastRefreshed: ticket.lastRefreshed,
          zone: ticket.zone
        }
      }, { status: 400 });
    }

    // 驗證簽名
    const isValid = dynamicTicket.verifyTicketData(
      {
        ticketId: ticket.ticketId,
        timestamp: Number(ticket.dynamicData.timestamp),
        nonce: ticket.dynamicData.nonce,
        signature: ticket.dynamicData.signature
      },
      TICKET_SECRET_KEY
    );
    if (!isValid) {
      return NextResponse.json(
        { error: '票券驗證失敗，可能是偽造票券', ticketDetails: ticket },
        { status: 400 }
      );
    }

    // 將票券標記為已使用
    await db.tickets.updateStatus(ticket.ticketId, 'used');

    // 返回票券詳情
    return NextResponse.json({
      success: true,
      message: '票券驗證成功',
      ticketDetails: {
        ticketId: ticket.ticketId,
        eventId: ticket.eventId,
        eventName: ticket.eventName,
        eventDate: ticket.eventDate,
        zone: ticket.zone,
        userRealName: ticket.userRealName,
        seatNumber: ticket.seatNumber || '無指定座位',
        verifiedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error verifying ticket:', error);
    return NextResponse.json(
      { error: '驗證票券時出錯' },
      { status: 500 }
    );
  }
}
