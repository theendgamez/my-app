'use server';

import { revalidatePath } from 'next/cache';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

interface BookingFormData {
  eventId: string;
  userId: string;
  zone: string;
  quantity: number;
  totalPrice: number;
}

export async function createBooking(formData: BookingFormData) {
  try {
    const bookingToken = uuidv4();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now
    
    const booking = {
      bookingToken,
      sessionId: '', // Set this appropriately if you have a session, otherwise leave as empty string or generate as needed
      eventId: formData.eventId,
      userId: formData.userId,
      zone: formData.zone,
      quantity: formData.quantity,
      status: "pending" as const,
      expiresAt: expiresAt.toString(),
      // Remove totalAmount and createdAt if not part of Booking interface
    };
    
    // Save to database
    await db.bookings.create(booking);
    
    // Revalidate related paths
    revalidatePath(`/events/${formData.eventId}`);
    revalidatePath(`/user/cart`);
    
    return {
      success: true,
      booking,
      redirectUrl: `/events/${formData.eventId}/payment?bookingToken=${bookingToken}`
    };
  } catch (error) {
    console.error('Booking creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create booking'
    };
  }
}

export async function cancelBooking(bookingToken: string, userId: string) {
  try {
    // Find booking to get eventId for revalidation
    const booking = await db.bookings.findIntentByToken(bookingToken);
    
    if (!booking || booking.userId !== userId) {
      return { success: false, error: 'Booking not found or not authorized' };
    }
    
    // Update status
    // If there is no update method, you may need to delete and recreate, or add an update method to your db.bookings.
    // For now, let's assume you can only delete:
    await db.bookings.delete(bookingToken);
    // Optionally, you could log or handle the "cancelled" status elsewhere if needed.
    
    // Revalidate paths
    revalidatePath(`/user/cart`);
    revalidatePath(`/events/${booking.eventId}`);
    
    return { success: true };
  } catch (error) {
    console.error('Cancel booking error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel booking'
    };
  }
}
