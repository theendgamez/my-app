import db from '@/lib/db';

// Define an interface for the registration object
interface Registration {
  registrationToken: string;
  ticketIds?: string[];
  ticketId?: string; // For backward compatibility
  platformFee?: number;
  platformFeePaid?: boolean;
  ticketPrice?: number;
  ticketPaid?: boolean;
  status?: 'pending' | 'won' | 'lost' | 'confirmed' | 'registered' | 'drawn';
  eventId?: string;
  userId?: string;
  zoneName?: string;
  quantity?: number;
  paymentStatus?: string;
  paymentId?: string;
  eventName?: string;
  totalAmount?: number;
  paidAt?: string;
  createdAt?: string;
  drawDate?: string;
  isDrawn?: boolean;
  ticketsPurchased?: boolean;
  phoneNumber?: string;
}

/**
 * Validates that a ticket has a valid registration token before payment
 * @param ticketId - The ID of the ticket being paid for
 * @returns The registration token if valid, null otherwise
 */
export async function validateLotteryTicket(ticketId: string) {
  try {
    if (!ticketId) return null;
    
    // First get the ticket
    const ticket = await db.tickets.findById(ticketId);
    if (!ticket) {
      console.error(`Ticket not found: ${ticketId}`);
      return null;
    }
    
    // Find the registration record for this ticket
    const registrations = await db.registration.findByTicket(ticketId);
    
    // Check if the result is null or empty array
    if (!registrations || (Array.isArray(registrations) && registrations.length === 0)) {
      console.error(`No registration found for ticket ${ticketId}`);
      
      // Try fallback: Find registrations with this ticket in the ticketIds array
      try {
        const allRegistrations = await db.registration.findMany() as Registration[];
        const matchingReg = allRegistrations.find((reg) => 
          reg.ticketIds && Array.isArray(reg.ticketIds) && reg.ticketIds.includes(ticketId)
        );
        
        if (matchingReg) {
          console.log(`Found registration via fallback for ticket: ${ticketId}`);
          return matchingReg.registrationToken;
        }
      } catch (fallbackError) {
        console.error('Fallback registration search failed:', fallbackError);
      }
      
      return null;
    }
    
    // If result is an array, get the first item's token
    if (Array.isArray(registrations)) {
      return registrations[0].registrationToken;
    }
    
    // If result is a single object, return its token
    return (registrations as Registration).registrationToken;
  } catch (error) {
    console.error('Error validating lottery ticket:', error);
    return null;
  }
}

/**
 * Links a ticket to a registration record if not already linked
 * @param ticketId - The ticket ID
 * @param registrationToken - The registration token
 */
export async function linkTicketToRegistration(ticketId: string, registrationToken: string) {
  try {
    // Check if already linked
    const registrations = await db.registration.findByTicket(ticketId);
    if ((Array.isArray(registrations) && registrations.length > 0) || 
        (!Array.isArray(registrations) && registrations)) {
      return true; // Already linked
    }

    // Get registration record
    const registration = await db.registration.findByToken(registrationToken) as Registration | null;
    if (!registration) {
      console.error(`Registration not found for token: ${registrationToken}`);
      return false;
    }
    
    // Prepare ticketIds array
    const existingTicketIds = registration.ticketIds || [];
    const updatedTicketIds = Array.isArray(existingTicketIds) 
      ? [...existingTicketIds, ticketId]
      : [ticketId];
    
    // Update registration to include ticket ID
    await db.registration.update(registrationToken, { 
      ticketIds: updatedTicketIds,
      ticketId // For backward compatibility
    });
    
    console.log(`Linked ticket ${ticketId} to registration ${registrationToken}`);
    return true;
  } catch (error) {
    console.error('Error linking ticket to registration:', error);
    return false;
  }
}
