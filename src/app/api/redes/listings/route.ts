import { NextResponse } from 'next/server'
import { getAuthStatus } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/redes/listings
// Returns properties published on each network (MercadoLibre, ZonaProp, Cabaprop)
// grouped by network. Each entry includes the property info, the listing status,
// permalink (if any), last sync date and error messages.
//
// Query params:
//   ?network=mercadolibre|zonaprop|cabaprop   → filter by single network
//   ?status=active|paused|pending|error       → filter by listing status
//
// Response shape:
//   {
//     networks: {
//       mercadolibre: { key, name, color, total, byStatus: {...}, items: [...] },
//       zonaprop:     { ... },
//       cabaprop:     { ... },
//     },
//     totals: { networks: 3, listings: <sum>, properties: <unique propertyIds> }
//   }
export async function GET(request: Request) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const networkFilter = searchParams.get('network') // 'mercadolibre' | 'zonaprop' | 'cabaprop' | null
    const statusFilter = searchParams.get('status')   // 'active' | 'paused' | 'pending' | 'error' | null

    // --------------------------------------------------------------
    // Fetch listings in parallel
    // --------------------------------------------------------------
    const [mlListings, zpListings, cbListings] = await Promise.all([
      prisma.mercadoLibreListing.findMany({
        include: {
          property: {
            select: {
              id: true, code: true, title: true, type: true, operation: true,
              price: true, location: true, image: true, active: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }).catch((err) => {
        console.error('Error fetching ML listings:', err)
        return []
      }),
      prisma.zonaPropListing.findMany({
        include: {
          property: {
            select: {
              id: true, code: true, title: true, type: true, operation: true,
              price: true, location: true, image: true, active: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }).catch((err) => {
        console.error('Error fetching ZP listings:', err)
        return []
      }),
      prisma.cabapropListing.findMany({
        include: {
          property: {
            select: {
              id: true, code: true, title: true, type: true, operation: true,
              price: true, location: true, image: true, active: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }).catch((err) => {
        console.error('Error fetching CB listings:', err)
        return []
      }),
    ])

    // --------------------------------------------------------------
    // Helpers
    // --------------------------------------------------------------
    const normalizeStatus = (raw: string): 'active' | 'paused' | 'pending' | 'error' | 'closed' | 'removed' => {
      const s = (raw || '').toLowerCase()
      if (['active', 'paused', 'pending', 'error', 'closed', 'removed'].includes(s)) {
        return s as any
      }
      return 'pending'
    }

    const formatListing = (
      id: string,
      status: string,
      permalink: string,
      externalId: string,
      lastSynced: string | null,
      errorMessage: string,
      createdAt: string,
      updatedAt: string,
      property: any,
    ) => ({
      id,
      status: normalizeStatus(status),
      permalink: permalink || '',
      externalId: externalId || '',
      lastSynced,
      errorMessage: errorMessage || '',
      createdAt,
      updatedAt,
      property: property
        ? {
            id: property.id,
            code: property.code,
            title: property.title,
            type: property.type,
            operation: property.operation,
            price: property.price,
            location: property.location,
            image: property.image,
            active: property.active,
          }
        : null,
    })

    // --------------------------------------------------------------
    // Build network groups
    // --------------------------------------------------------------
    const buildNetworkGroup = (
      key: string,
      name: string,
      color: string,
      textColor: string,
      rawItems: any[],
      mapItem: (raw: any) => any,
    ) => {
      let items = rawItems.map(mapItem)
      if (statusFilter) {
        items = items.filter((it) => it.status === statusFilter)
      }
      const byStatus: Record<string, number> = {}
      for (const it of items) {
        byStatus[it.status] = (byStatus[it.status] || 0) + 1
      }
      return {
        key,
        name,
        color,
        textColor,
        total: items.length,
        byStatus,
        items,
      }
    }

    const networks: Record<string, any> = {}

    if (!networkFilter || networkFilter === 'mercadolibre') {
      networks.mercadolibre = buildNetworkGroup(
        'mercadolibre', 'Mercado Libre', '#FFE600', '#000000',
        mlListings,
        (l) => formatListing(
          l.id, l.status, l.mlPermalink, l.mlItemId,
          l.lastSynced ? l.lastSynced.toISOString() : null,
          l.errorMessage,
          l.createdAt.toISOString(), l.updatedAt.toISOString(),
          l.property,
        ),
      )
    }

    if (!networkFilter || networkFilter === 'zonaprop') {
      networks.zonaprop = buildNetworkGroup(
        'zonaprop', 'ZonaProp', '#7B2C8E', '#FFFFFF',
        zpListings,
        (l) => formatListing(
          l.id, l.zpStatus, '', l.zpId,
          null, '',
          l.createdAt.toISOString(), l.updatedAt.toISOString(),
          l.property,
        ),
      )
    }

    if (!networkFilter || networkFilter === 'cabaprop') {
      networks.cabaprop = buildNetworkGroup(
        'cabaprop', 'CabaProp', '#1B4965', '#FFFFFF',
        cbListings,
        (l) => formatListing(
          l.id, l.cbStatus, l.cbPermalink, l.cbId,
          l.lastSynced ? l.lastSynced.toISOString() : null,
          l.errorMessage,
          l.createdAt.toISOString(), l.updatedAt.toISOString(),
          l.property,
        ),
      )
    }

    // --------------------------------------------------------------
    // Totals
    // --------------------------------------------------------------
    const allItems = Object.values(networks).flatMap((n: any) => n.items)
    const uniquePropertyIds = new Set(
      allItems.map((it: any) => it.property?.id).filter(Boolean) as string[]
    )

    const totals = {
      networks: Object.keys(networks).length,
      listings: allItems.length,
      properties: uniquePropertyIds.size,
    }

    return NextResponse.json(
      { networks, totals },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  } catch (error: any) {
    console.error('GET /api/redes/listings error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
