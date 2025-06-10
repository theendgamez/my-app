import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db'; // Assuming your db utility
import { getCurrentUser } from '@/lib/auth'; // Assuming your auth utility
import { Ticket } from '@/types'; // Assuming your Ticket type is in @/types

export async function PATCH(
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

    const existingTicket = await db.tickets.findById(ticketId);
    if (!existingTicket) {
      return NextResponse.json(
        { error: `Ticket with ID ${ticketId} not found.` },
        { status: 404 }
      );
    }
    
    // Optional: Add logic to check if the ticket can be cancelled
    if (existingTicket.status === 'cancelled') {
        return NextResponse.json(
            { error: 'Ticket already cancelled.', ticket: existingTicket as Ticket },
            { status: 409 } // Conflict
        );
    }
     if (existingTicket.status === 'used') {
        return NextResponse.json(
            { error: 'Cannot cancel a ticket that has already been used.', ticket: existingTicket as Ticket },
            { status: 400 }
        );
    }

    // Update the ticket status to 'cancelled'
    // Adjust this line based on your actual database interaction library
    const updatedTicket = await db.tickets.update(ticketId, { status: 'cancelled' });
    
    if (!updatedTicket) {
         return NextResponse.json(
            { error: `Failed to cancel ticket with ID ${ticketId}.` },
            { status: 500 }
        );
    }

    return NextResponse.json(updatedTicket as Ticket);

  } catch (error) {
    console.error(`Error cancelling ticket ${ (await params).id}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to cancel ticket.', details: errorMessage },
      { status: 500 }
    );
  }
}
