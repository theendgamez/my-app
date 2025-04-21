import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { Registration } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const token = (await params).token;
    if (!token) {
      return NextResponse.json({ error: 'Missing registration token' }, { status: 400 });
    }

    const registration = await db.registration.findByToken(token) as Registration;
    if (!registration) {
      return NextResponse.json({ error: 'Registration not found', registrationToken: token }, { status: 404 });
    }

    const event = await db.events.findById(registration.eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found for this registration', eventId: registration.eventId }, { status: 404 });
    }

    const zoneDetails = event.zones?.find(z => z.name === registration.zoneName);

    return NextResponse.json({
      registration,
      event: {
        eventId: event.eventId,
        eventName: event.eventName,
        eventDate: event.eventDate,
        location: event.location,
        drawDate: event.drawDate,
        isDrawMode: event.isDrawMode
      },
      zoneDetails
    });
  } catch (error) {
    console.error('Error fetching registration details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch registration details', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
