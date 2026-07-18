import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    ok: true,
    service: 'nom-affiliate-partner-program',
    timestamp: new Date().toISOString(),
  });
}
