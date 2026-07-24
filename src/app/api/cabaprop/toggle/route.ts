import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthStatus } from '@/lib/auth'
import { getCabapropSettings, buildCabapropProperty, publishToCabaprop, removeFromCabaprop } from '@/lib/cabaprop'

// POST - Add property to Cabaprop
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { propertyId } = await request.json()
    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId es requerido' }, { status: 400 })
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { temporadas: { orderBy: [{ order: 'asc' }, { startDate: 'asc' }] } },
    })
    if (!property || !property.active) {
      return NextResponse.json({ error: 'Propiedad no encontrada o inactiva' }, { status: 404 })
    }

    const settings = await getCabapropSettings()
    if (!settings?.apiKey) {
      return NextResponse.json({ error: 'No hay API Key de Cabaprop configurada. Configurala en la página de Cabaprop.' }, { status: 400 })
    }

    const existing = await prisma.cabapropListing.findUnique({ where: { propertyId } })

    let cbId = ''
    let cbPermalink = ''
    let errorMessage = ''
    let cbStatus = 'active'

    try {
      const propertyData = buildCabapropProperty(property)
      const result = await publishToCabaprop(settings.apiKey, propertyData)
      cbId = result.id || result.property_id || ''
      cbPermalink = result.url || result.permalink || ''
    } catch (err: any) {
      errorMessage = err.message || 'Error al publicar en Cabaprop'
      cbStatus = 'error'
    }

    if (existing) {
      await prisma.cabapropListing.update({
        where: { propertyId },
        data: {
          cbStatus,
          cbId: cbId || existing.cbId,
          cbPermalink: cbPermalink || existing.cbPermalink,
          errorMessage,
          lastSynced: cbStatus === 'active' ? new Date() : existing.lastSynced,
        },
      })
    } else {
      await prisma.cabapropListing.create({
        data: {
          propertyId,
          cbStatus,
          cbId,
          cbPermalink,
          errorMessage,
          lastSynced: cbStatus === 'active' ? new Date() : null,
        },
      })
    }

    return NextResponse.json({
      success: true,
      cbStatus,
      cbId,
      cbPermalink,
      errorMessage: errorMessage || undefined,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Remove property from Cabaprop
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { propertyId } = await request.json()
    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId es requerido' }, { status: 400 })
    }

    const listing = await prisma.cabapropListing.findUnique({ where: { propertyId } })
    if (listing?.cbId) {
      const settings = await getCabapropSettings()
      if (settings?.apiKey) {
        try {
          await removeFromCabaprop(settings.apiKey, listing.cbId)
        } catch {}
      }
    }

    await prisma.cabapropListing.deleteMany({ where: { propertyId } })

    return NextResponse.json({ success: true, message: 'Propiedad eliminada de Cabaprop' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET - Get all Cabaprop listings
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const listings = await prisma.cabapropListing.findMany({
      include: {
        property: { select: { id: true, title: true, code: true, operation: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const settings = await getCabapropSettings()

    return NextResponse.json({
      listings,
      configured: !!settings?.apiKey,
      matricula: settings?.matricula || '',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
