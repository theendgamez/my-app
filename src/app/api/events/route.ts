import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    // Use the same db utility that your events page is using
    const events = await db.events.findMany();
    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
