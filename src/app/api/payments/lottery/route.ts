import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { validateLotteryTicket, linkTicketToRegistration } from '@/lib/lottery';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { ticketId } = data;
    
    console.log(`Processing lottery payment for ticket: ${ticketId}`);
    
    // Validate the lottery ticket has a registration
    const registrationToken = await validateLotteryTicket(ticketId);
    if (!registrationToken) {
      // Try to find registration through other means
      console.log(`Finding registration for ticket ${ticketId} through alternate methods`);
      
      // Try to find a registration that might be associated with this ticket
      const ticket = await db.tickets.findById(ticketId);
      if (ticket && ticket.status === 'reserved') {
        try {
          // Find by event and user
          type Registration = {
            registrationToken: string;
            status: string;
            ticketsPurchased?: number;
            paymentStatus?: string;
            // add other fields as needed
          };

          const registrations = await db.registration.findByEventAndUser(ticket.eventId, ticket.userId) as Registration[];
          if (Array.isArray(registrations) && registrations.length > 0) {
            const matchingReg = registrations.find(
              (reg: Registration) => reg.status === 'won' && (!reg.ticketsPurchased || reg.paymentStatus !== 'paid')
            );
            
            if (matchingReg) {
              console.log(`Found matching registration, attempting to link`);
              const linked = await linkTicketToRegistration(ticketId, matchingReg.registrationToken);
              
              if (linked) {
                console.log(`Successfully linked ticket to registration`);
                return NextResponse.json({ 
                  success: true,
                  registrationToken: matchingReg.registrationToken,
                  message: 'Ticket successfully linked to registration'
                });
              }
            }
          }
        } catch (error) {
          console.error('Error in alternative registration lookup:', error);
        }
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: '缺少抽籤登記令牌',
          message: 'Missing lottery registration token'
        },
        { status: 400 }
      );
    }
    
    // Continue with payment processing
    // ...existing payment processing code...
    
    return NextResponse.json({ success: true, registrationToken });
  } catch (error) {
    console.error('Error processing lottery payment:', error);
    return NextResponse.json(
      { success: false, error: 'Payment processing failed' },
      { status: 500 }
    );
  }
}
