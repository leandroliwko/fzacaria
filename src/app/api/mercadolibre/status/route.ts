import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthStatus } from '@/lib/auth'
import { getValidToken, getMLItemStatus } from '@/lib/mercadolibre'

// GET - Get ML listing status for all properties or a specific one
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const propertyId = request.nextUrl.searchParams.get('propertyId')

    if (propertyId) {
      // Get status for specific property
      const listing = await prisma.mercadoLibreListing.findUnique({
        where: { propertyId },
      })

      if (!listing) {
        return NextResponse.json({ published: false })
      }

      // Try to sync with ML
      if (listing.mlItemId) {
        try {
          const accessToken = await getValidToken()
          const mlItem = await getMLItemStatus(accessToken, listing.mlItemId)

          await prisma.mercadoLibreListing.update({
            where: { propertyId },
            data: {
              status: mlItem.status || listing.status,
              mlPermalink: mlItem.permalink || listing.mlPermalink,
              lastSynced: new Date(),
            },
          })

          return NextResponse.json({
            published: true,
            mlItemId: listing.mlItemId,
            mlPermalink: mlItem.permalink || listing.mlPermalink,
            status: mlItem.status,
            lastSynced: new Date().toISOString(),
          })
        } catch {
          // Can't sync, return cached data
          return NextResponse.json({
            published: true,
            mlItemId: listing.mlItemId,
            mlPermalink: listing.mlPermalink,
            status: listing.status,
            errorMessage: listing.errorMessage,
            lastSynced: listing.lastSynced?.toISOString(),
          })
        }
      }

      return NextResponse.json({
        published: true,
        status: listing.status,
        errorMessage: listing.errorMessage,
      })
    }

    // Get all ML listings
    const listings = await prisma.mercadoLibreListing.findMany({
      include: { property: { select: { id: true, title: true, code: true, operation: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ listings })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
