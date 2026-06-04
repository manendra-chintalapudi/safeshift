import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'safeshift',
    timestamp: new Date().toISOString(),
  });
}
