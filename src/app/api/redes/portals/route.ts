import { NextResponse } from 'next/server'
import { getAuthStatus } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Catalog of Argentine real-estate portals and networks the agency could
// connect to. Hardcoded catalog — statuses are enriched from the DB at runtime.
const PORTAL_CATALOG = [
  {
    key: 'mercadolibre',
    name: 'Mercado Libre',
    type: 'portal',
    description: 'Portal clasificados líder de Latinoamérica. Integración vía OAuth 2.0 con publicación automática.',
    docs: 'https://developers.mercadolibre.com.ar',
    adminPath: '/admin/mercadolibre',
    color: '#FFE600',
    textColor: '#000000',
    icon: 'shopping-cart',
  },
  {
    key: 'zonaprop',
    name: 'ZonaProp',
    type: 'portal',
    description: 'Portal inmobiliario de Argentina. Integración vía feed XML público (no requiere API key).',
    docs: 'https://www.zonaprop.com.ar/profesional',
    adminPath: '/admin/zonaprop',
    color: '#7B2C8E',
    textColor: '#FFFFFF',
    icon: 'map-pin',
  },
  {
    key: 'cabaprop',
    name: 'CabaProp',
    type: 'portal',
    description: 'Portal oficial CUCICBA para CABA. Integración vía API Key Bearer.',
    docs: 'https://www.cabaprop.com.ar',
    adminPath: '/admin/cabaprop',
    color: '#1B4965',
    textColor: '#FFFFFF',
    icon: 'landmark',
  },
  {
    key: 'pixelinmobiliario',
    name: 'Pixel Inmobiliario',
    type: 'crm',
    description: 'CRM inmobiliario con módulo de redes inter-inmobiliarias. Permite compartir propiedades con otras agencias y dividir honorarios. Requiere cuenta activa en pixelinmobiliario.com.ar',
    docs: 'https://pixelinmobiliario.com.ar',
    adminPath: null,
    color: '#abd305',
    textColor: '#FFFFFF',
    icon: 'network',
  },
  {
    key: 'inmoclick',
    name: 'Inmoclick',
    type: 'portal',
    description: 'Portal inmobiliario argentino. Feed XML o carga manual.',
    docs: 'https://www.inmoclick.com.ar',
    adminPath: null,
    color: '#0066CC',
    textColor: '#FFFFFF',
    icon: 'mouse-pointer',
  },
  {
    key: 'facebook',
    name: 'Facebook Marketplace',
    type: 'social',
    description: 'Publicación en Facebook Marketplace y páginas. Carga manual.',
    docs: 'https://www.facebook.com/marketplace',
    adminPath: null,
    color: '#1877F2',
    textColor: '#FFFFFF',
    icon: 'facebook',
  },
  {
    key: 'instagram',
    name: 'Instagram',
    type: 'social',
    description: 'Publicación en Instagram. Carga manual o vía Meta Business API.',
    docs: 'https://www.facebook.com/business/instagram',
    adminPath: null,
    color: '#E1306C',
    textColor: '#FFFFFF',
    icon: 'instagram',
  },
]

// GET - Returns the full catalog of portals with their current connection status
export async function GET() {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Probe DB for connection status of each portal that has DB-backed integration
    const [
      mlSettings,
      mlListingsCount,
      zpListingsCount,
      cbSettings,
      cbListingsCount,
    ] = await Promise.all([
      prisma.mLSettings.findFirst().catch(() => null),
      prisma.mercadoLibreListing.count().catch(() => 0),
      prisma.zonaPropListing.count().catch(() => 0),
      prisma.cabapropSettings.findFirst().catch(() => null),
      prisma.cabapropListing.count().catch(() => 0),
    ])

    // Also check ML token presence
    const mlToken = await prisma.mercadoLibreToken.findFirst().catch(() => null)

    // Build status map
    const statusMap: Record<string, {
      status: 'connected' | 'available' | 'pending' | 'error'
      detail?: string
      listings?: number
    }> = {}

    // MercadoLibre: connected if token exists, available if no settings, pending if settings but no token
    if (mlToken) {
      statusMap.mercadolibre = { status: 'connected', listings: mlListingsCount }
    } else if (mlSettings?.appId) {
      statusMap.mercadolibre = { status: 'pending', detail: 'Configurado pero no autenticado', listings: mlListingsCount }
    } else {
      statusMap.mercadolibre = { status: 'available', listings: mlListingsCount }
    }

    // ZonaProp: connected if at least one listing (no API key needed)
    if (zpListingsCount > 0) {
      statusMap.zonaprop = { status: 'connected', listings: zpListingsCount }
    } else {
      statusMap.zonaprop = { status: 'available', listings: 0 }
    }

    // Cabaprop: connected if API key is set
    if (cbSettings?.apiKey) {
      statusMap.cabaprop = { status: 'connected', listings: cbListingsCount }
    } else {
      statusMap.cabaprop = { status: 'available', listings: 0 }
    }

    // Enrich the catalog with status
    const enriched = PORTAL_CATALOG.map((portal) => ({
      ...portal,
      status: statusMap[portal.key]?.status || 'available',
      statusDetail: statusMap[portal.key]?.detail || '',
      listings: statusMap[portal.key]?.listings || 0,
    }))

    // Summary stats
    const stats = {
      total: enriched.length,
      connected: enriched.filter((p) => p.status === 'connected').length,
      pending: enriched.filter((p) => p.status === 'pending').length,
      available: enriched.filter((p) => p.status === 'available').length,
    }

    return NextResponse.json(
      { portals: enriched, stats },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  } catch (error: any) {
    console.error('GET /api/redes/portals error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
