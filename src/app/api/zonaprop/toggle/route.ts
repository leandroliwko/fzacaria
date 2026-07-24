import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthStatus } from '@/lib/auth'

// POST - Add property to ZonaProp feed
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

    const property = await prisma.property.findUnique({ where: { id: propertyId } })
    if (!property || !property.active) {
      return NextResponse.json({ error: 'Propiedad no encontrada o inactiva' }, { status: 404 })
    }

    const listing = await prisma.zonaPropListing.upsert({
      where: { propertyId },
      create: { propertyId, zpStatus: 'active' },
      update: { zpStatus: 'active' },
    })

    return NextResponse.json({ success: true, listing })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Remove property from ZonaProp feed
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

    await prisma.zonaPropListing.deleteMany({ where: { propertyId } })

    return NextResponse.json({ success: true, message: 'Propiedad eliminada del feed de ZonaProp' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET - Get all ZonaProp listings
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const listings = await prisma.zonaPropListing.findMany({
      include: {
        property: { select: { id: true, title: true, code: true, operation: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ listings })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
