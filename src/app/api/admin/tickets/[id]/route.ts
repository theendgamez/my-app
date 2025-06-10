import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Ticket } from '@/types'; // Assuming your Ticket type is in @/types

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const ticketId = (await params).id;

    if (!ticketId) {
      return NextResponse.json(
        { error: 'Ticket ID is required.' },
        { status: 400 }
      );
    }

    const ticket = await db.tickets.findById(ticketId);

    if (!ticket) {
      return NextResponse.json(
        { error: `Ticket with ID ${ticketId} not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json(ticket as Ticket);

  } catch (error) {
    console.error(`Error fetching ticket ${(await params).id}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to fetch ticket details.', details: errorMessage },
      { status: 500 }
    );
  }
}
