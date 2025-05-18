import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise <{id: string }> } // Correct type signature
) {
    try {
        const bookingId = (await params).id; // Access id directly
        
        // First check if the request has any content at all
        const contentLength = request.headers.get('content-length');
        if (!contentLength || parseInt(contentLength) === 0) {
            return NextResponse.json(
                { error: "請求主體為空，需要包含 JSON 格式數據" },
                { status: 400 }
            );
        }
        
        // Check content type
        const contentType = request.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            return NextResponse.json(
                { error: "請求格式錯誤，需要 JSON 格式 (Content-Type: application/json)" },
                { status: 400 }
            );
        }
        
        // Get request body with error handling
        let body;
        try {
            // Read request as text first for diagnostic purposes (if needed)
            const rawText = await request.text();
            console.log("Raw request body:", rawText);
            
            if (!rawText || rawText.trim() === '') {
                return NextResponse.json(
                    { error: "請求主體為空，需要包含 userId" },
                    { status: 400 }
                );
            }
            
            // Parse the text as JSON
            try {
                body = JSON.parse(rawText);
            } catch (jsonError) {
                console.error("JSON parsing error:", jsonError);
                return NextResponse.json(
                    { error: "請求格式錯誤，無效的 JSON 格式", details: jsonError instanceof Error ? jsonError.message : 'Unknown parsing error' },
                    { status: 400 }
                );
            }
            
            // If parsing succeeds but body is empty
            if (!body || Object.keys(body).length === 0) {
                return NextResponse.json(
                    { error: "請求主體為空，需要包含 userId" },
                    { status: 400 }
                );
            }
        } catch (error) {
            // General error catch for the entire body parsing process
            console.error("Error processing request body:", error);
            return NextResponse.json(
                { error: "處理請求主體時出錯", details: error instanceof Error ? error.message : 'Unknown error' },
                { status: 400 }
            );
        }
        
        // Check if userId is provided
        if (!body.userId) {
            return NextResponse.json(
                { error: "缺少使用者ID" },
                { status: 400 }
            );
        }
        
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