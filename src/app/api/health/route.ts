import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      data: { status: 'healthy', timestamp: new Date().toISOString() },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNHEALTHY', message: 'Service unhealthy', details: e?.message } },
      { status: 503 }
    );
  }
}
