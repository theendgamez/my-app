import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise <{id: string }> } // Correct type signature
) {
    try {
        const bookingId = (await params).id; // Access id directly
        
        // Get request body
        const body = await request.json();
        const { userId } = body;
        
        // Check if booking exists
        const booking = await db.bookings.findIntentByToken(bookingId);
        
        if (!booking) {
            return NextResponse.json(
                { error: "訂單不存在" },
                { status: 404 }
            );
        }
        
        // Verify the user owns this booking
        if (booking.userId !== userId) {
            return NextResponse.json(
                { error: "無權取消此訂單" },
                { status: 403 }
            );
        }
        
        // Only allow canceling pending bookings
        if (booking.status !== 'pending') {
            return NextResponse.json(
                { error: "此訂單狀態無法取消" },
                { status: 400 }
            );
        }
        
        // Cancel the booking
        await db.bookings.delete(bookingId);
        
        return NextResponse.json(
            { message: "訂單取消成功" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error cancelling booking:", error);
        return NextResponse.json(
            { error: "取消訂單失敗", details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// Also fix the DELETE handler
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: bookingId } = await params;
        
        // Check if booking exists
        const booking = await db.bookings.findIntentByToken(bookingId);
        
        if (!booking) {
            return NextResponse.json(
                { error: "Booking not found" },
                { status: 404 }
            );
        }
        
        // Delete the booking from database
        await db.bookings.delete(bookingId);
        
        return NextResponse.json(
            { message: "Booking cancelled successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error cancelling booking:", error);
        return NextResponse.json(
            { error: "Failed to cancel booking" },
            { status: 500 }
        );
    }
}