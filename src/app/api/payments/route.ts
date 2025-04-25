import { NextRequest } from 'next/server';

// This endpoint forwards POST requests to the real payment processing endpoint
export async function POST(request: NextRequest) {
  // Clone the request to reuse its body
  const clonedRequest = request.clone();
  
  // Forward to the actual process endpoint
  const response = await fetch(new URL('/api/payments/process', request.url), {
    method: 'POST',
    headers: request.headers,
    body: await clonedRequest.text(),
  });

  // Return the response from the process endpoint
  return response;
}
