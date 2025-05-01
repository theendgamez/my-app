import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET event by ID - public access
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    
    if (!id) {
      return NextResponse.json({ error: '必須提供活動ID' }, { status: 400 });
    }

    const event = await db.events.findById(id);
    
    if (!event) {
      return NextResponse.json({ error: '找不到活動' }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { error: '獲取活動詳情時出錯' },
      { status: 500 }
    );
  }
}

// DELETE event - admin only
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    
    // Admin authorization check
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: '僅管理員可刪除活動' },
        { status: 403 }
      );
    }
    
    if (!id) {
      return NextResponse.json(
        { error: '必須提供活動ID' },
        { status: 400 }
      );
    }

    const event = await db.events.findById(id);
    if (!event) {
      return NextResponse.json(
        { error: '找不到活動' },
        { status: 404 }
      );
    }

    // Delete the event
    await db.events.delete(id);

    return NextResponse.json(
      { message: '活動已成功刪除' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: '刪除活動時出錯' },
      { status: 500 }
    );
  }
}

// PATCH event - admin only
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    
    // Admin authorization check
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: '僅管理員可更新活動' },
        { status: 403 }
      );
    }
    
    if (!id) {
      return NextResponse.json({ error: '必須提供活動ID' }, { status: 400 });
    }

    const event = await db.events.findById(id);
    if (!event) {
      return NextResponse.json({ error: '找不到活動' }, { status: 404 });
    }

    // Get update data
    const updateData = await request.json();
    
    // Update the event
    const updatedEvent = await db.events.update(id, updateData);

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: '更新活動時出錯' },
      { status: 500 }
    );
  }
}