import { NextResponse } from 'next/server';

// This path cannot be properly statically exported, so we're using a simple static response
export async function GET() {
  // Return a static response for static builds
  return NextResponse.json({
    error: 'Token refresh is not available in static builds',
    message: 'Please implement client-side token refresh or redirection to login',
    staticBuild: true
  }, { status: 401 });
}

// Add the necessary export config to prevent this route from being included in static builds
export const dynamic = 'force-dynamic';