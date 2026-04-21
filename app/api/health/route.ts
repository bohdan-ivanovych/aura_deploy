import { NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'

export async function GET() {
  const checks = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
  ])
  const db = checks[0].status === 'fulfilled' ? 'ok' : 'error'
  const status = db === 'ok' ? 200 : 503
  return NextResponse.json({ db, timestamp: new Date().toISOString() }, { status })
}
