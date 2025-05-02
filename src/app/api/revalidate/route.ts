import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse the JSON body
    const { path } = await request.json();
    
    // Validate path
    if (!path || typeof path !== 'string') {
      return NextResponse.json(
        { error: 'Invalid path parameter' }, 
        { status: 400 }
      );
    }
    
    // Revalidate the path
    revalidatePath(path);
    
    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (error) {
    console.error('Revalidation error:', error);
    return NextResponse.json(
      { error: 'Error revalidating' }, 
      { status: 500 }
    );
  }
}
