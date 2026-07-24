import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthStatus } from '@/lib/auth'

// Auto-backup trigger: fires backup if last one was >15 min ago
async function triggerAutoBackupIfNeeded() {
  try {
    const lastBackup = await prisma.backup.findFirst({
      where: { type: 'auto', status: 'completed' },
      orderBy: { createdAt: 'desc' }
    })

    if (lastBackup) {
      const minutesSinceLastBackup = (Date.now() - new Date(lastBackup.createdAt).getTime()) / 60000
      if (minutesSinceLastBackup < 15) return // Skip if less than 15 min
    }

    // Fire backup in background (don't await)
    fetch(`${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/backup/auto`).catch(() => {})
  } catch {
    // Silently fail - backup is not critical for visit tracking
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const path = body.path || '/'

    // Get visitor info from headers
    const referrer = request.headers.get('referer') || ''
    const userAgent = request.headers.get('user-agent') || ''
    const country = request.headers.get('x-vercel-ip-country') || ''
    // Don't track admin pages
    if (path.startsWith('/admin')) {
      return NextResponse.json({ tracked: false })
    }

    await prisma.visit.create({
      data: {
        path,
        referrer,
        country,
        userAgent,
      },
    })

    // Trigger auto-backup check (fire and forget)
    triggerAutoBackupIfNeeded()

    return NextResponse.json({ tracked: true })
  } catch (error) {
    console.error('Visit tracking error:', error)
    return NextResponse.json({ tracked: false }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    const since = new Date()
    since.setDate(since.getDate() - days)

    // Total visits
    const totalVisits = await prisma.visit.count()

    // Visits in the period
    const periodVisits = await prisma.visit.count({
      where: { createdAt: { gte: since } },
    })

    // Today's visits
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayVisits = await prisma.visit.count({
      where: { createdAt: { gte: todayStart } },
    })

    // Yesterday's visits
    const yesterdayStart = new Date()
    yesterdayStart.setDate(yesterdayStart.getDate() - 1)
    yesterdayStart.setHours(0, 0, 0, 0)
    const yesterdayEnd = new Date()
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1)
    yesterdayEnd.setHours(23, 59, 59, 999)
    const yesterdayVisits = await prisma.visit.count({
      where: {
        createdAt: { gte: yesterdayStart, lte: yesterdayEnd },
      },
    })

    // Daily visits for chart (last N days)
    const dailyVisits: { date: string; label: string; visits: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date()
      dayStart.setDate(dayStart.getDate() - i)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart)
      dayEnd.setHours(23, 59, 59, 999)

      const count = await prisma.visit.count({
        where: {
          createdAt: { gte: dayStart, lte: dayEnd },
        },
      })

      dailyVisits.push({
        date: dayStart.toISOString().split('T')[0],
        label: dayStart.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }),
        visits: count,
      })
    }

    // Top pages
    const topPages = await prisma.visit.groupBy({
      by: ['path'],
      where: { createdAt: { gte: since } },
      _count: { path: true },
      orderBy: { _count: { path: 'desc' } },
      take: 10,
    })

    // Top countries
    const topCountries = await prisma.visit.groupBy({
      by: ['country'],
      where: { createdAt: { gte: since }, country: { not: '' } },
      _count: { country: true },
      orderBy: { _count: { country: 'desc' } },
      take: 5,
    })

    // Top referrers
    const topReferrers = await prisma.visit.groupBy({
      by: ['referrer'],
      where: { createdAt: { gte: since }, referrer: { not: '' } },
      _count: { referrer: true },
      orderBy: { _count: { referrer: 'desc' } },
      take: 5,
    })

    return NextResponse.json({
      totalVisits,
      periodVisits,
      todayVisits,
      yesterdayVisits,
      dailyVisits,
      topPages: topPages.map(p => ({ path: p.path, visits: p._count.path })),
      topCountries: topCountries.map(c => ({ country: c.country, visits: c._count.country })),
      topReferrers: topReferrers.map(r => ({ referrer: r.referrer, visits: r._count.referrer })),
    })
  } catch (error: any) {
    console.error('Visits stats error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
