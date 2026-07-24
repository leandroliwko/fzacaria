import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const totalProperties = await prisma.property.count({ where: { active: true } })
    const totalArticles = await prisma.article.count({ where: { active: true } })

    // Count by type for categories
    const typeCounts = await prisma.property.groupBy({
      by: ['type'],
      where: { active: true },
      _count: { type: true },
    })

    const countsByType: Record<string, number> = {}
    typeCounts.forEach((item) => {
      countsByType[item.type] = item._count.type
    })

    return NextResponse.json({
      totalProperties,
      totalArticles,
      countsByType,
    })
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
