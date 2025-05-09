import { NextRequest, NextResponse } from 'next/server';
import { predictScalper } from '@/utils/mlService';

export async function POST(request: NextRequest) {
  const features = await request.json();
  const keys = ['domain_frequency','is_mainstream','domain_length','is_suspicious','is_temporary'];
  if (!keys.every(k => typeof features[k] === 'number')) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  try {
    const prediction = await predictScalper(features);
    return NextResponse.json(prediction);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
