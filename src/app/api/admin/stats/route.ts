import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthStatus } from '@/lib/auth'

export async function GET() {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const [
      totalProperties,
      activeProperties,
      featuredProperties,
      totalArticles,
      activeArticles,
      unreadMessages,
      totalMessages,
      pendingTasaciones,
      totalTasaciones,
      recentMessages,
      recentTasaciones,
      recentProperties,
    ] = await Promise.all([
      prisma.property.count(),
      prisma.property.count({ where: { active: true } }),
      prisma.property.count({ where: { featured: true } }),
      prisma.article.count(),
      prisma.article.count({ where: { active: true } }),
      prisma.contactMessage.count({ where: { read: false } }),
      prisma.contactMessage.count(),
      prisma.tasacionRequest.count({ where: { contacted: false } }),
      prisma.tasacionRequest.count(),
      prisma.contactMessage.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.tasacionRequest.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.property.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    // Serialize dates for JSON response
    const serializeDates = (items: any[]) =>
      items.map((item: any) => {
        const serialized: any = {}
        for (const key of Object.keys(item)) {
          const val = item[key]
          serialized[key] = val instanceof Date ? val.toISOString() : val
        }
        return serialized
      })

    return NextResponse.json({
      totalProperties,
      activeProperties,
      featuredProperties,
      totalArticles,
      activeArticles,
      unreadMessages,
      totalMessages,
      pendingTasaciones,
      totalTasaciones,
      recentMessages: serializeDates(recentMessages),
      recentTasaciones: serializeDates(recentTasaciones),
      recentProperties: serializeDates(recentProperties),
    })
  } catch (error: any) {
    console.error('Stats API error:', error)
    return NextResponse.json({ error: 'Error del servidor', details: error.message }, { status: 500 })
  }
}
