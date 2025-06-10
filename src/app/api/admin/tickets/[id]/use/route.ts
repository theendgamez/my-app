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

    // Find the ticket first to ensure it exists and to check its current status
    const existingTicket = await db.tickets.findById(ticketId);
    if (!existingTicket) {
      return NextResponse.json(
        { error: `Ticket with ID ${ticketId} not found.` },
        { status: 404 }
      );
    }

    // Optional: Add logic to check if the ticket can be marked as used
    // For example, if it's already 'used' or 'cancelled', you might return an error or different response.
    if (existingTicket.status === 'used') {
        return NextResponse.json(
            { error: 'Ticket already marked as used.', ticket: existingTicket as Ticket },
            { status: 409 } // Conflict
        );
    }
    if (existingTicket.status === 'cancelled') {
        return NextResponse.json(
            { error: 'Cannot mark a cancelled ticket as used.', ticket: existingTicket as Ticket },
            { status: 400 }
        );
    }


    // Update the ticket status to 'used'
    // The exact method depends on your db utility (e.g., findByIdAndUpdate)
    const now = new Date().toISOString(); // Define 'now' for timestamps

    const updatedTicketData: Partial<Ticket> = { 
      status: 'used', 
      verificationInfo: {
        // Spread existing verificationInfo to preserve any other fields 
        // and handle cases where it might be initially undefined.
        ...(existingTicket.verificationInfo || {}),

        // Required fields based on the error message:
        verificationStatus: 'used', // Set the status to 'used'
        verifiedBy: currentUser.userId,  // Assuming currentUser.id is the admin's ID (string)
        verifierName: currentUser.userName || currentUser.userName || 'System Admin', // Admin's name or a fallback
        verificationCount: (existingTicket.verificationInfo?.verificationCount || 0) + 1, // Increment existing count or start at 1
        lastVerified: now, // Timestamp of this verification
        usageTimestamp: now 
      }
    }; 
    
    // Assuming db.tickets.update takes id and data, and returns the updated document
    // Adjust this line based on your actual database interaction library (e.g., Prisma, Mongoose)
    const updatedTicket = await db.tickets.update(ticketId, updatedTicketData);

    if (!updatedTicket) {
        // This case might occur if the update operation itself fails for some reason
        // or if your db.tickets.update method returns null/undefined on failure
         return NextResponse.json(
            { error: `Failed to update ticket with ID ${ticketId}.` },
            { status: 500 }
        );
    }

    return NextResponse.json(updatedTicket as Ticket);

  } catch (error) {
    console.error(`Error marking ticket ${(await params).id} as used:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to mark ticket as used.', details: errorMessage },
      { status: 500 }
    );
  }
}
