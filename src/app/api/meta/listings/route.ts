import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthStatus } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET - List all MetaListing records with the related property.
export async function GET() {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const listings = await prisma.metaListing.findMany({
      include: {
        property: {
          select: { id: true, title: true, code: true, operation: true, type: true, location: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ listings })
  } catch (error: any) {
    console.error('GET /api/meta/listings error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
