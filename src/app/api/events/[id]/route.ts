import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { error: "活動ID未提供" },
        { status: 400 }
      );
    }
    
    // Fetch the event details from database
    const event = await db.events.findById(id);
    
    if (!event) {
      return NextResponse.json(
        { error: "活動不存在" },
        { status: 404 }
      );
    }
    
    // Return the event data
    return NextResponse.json(event);
    
  } catch (error) {
    console.error('Error fetching event details:', error);
    return NextResponse.json(
      { error: '獲取活動詳情時出錯', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}