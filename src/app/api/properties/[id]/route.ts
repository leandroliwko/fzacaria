import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthStatus } from '@/lib/auth'

function serializeProperty(property: any) {
  const serialized: any = {}
  for (const key of Object.keys(property)) {
    if (key === 'temporadas' && Array.isArray(property[key])) {
      serialized[key] = property[key].map((t: any) => {
        const tobj: any = {}
        for (const tkey of Object.keys(t)) {
          tobj[tkey] = t[tkey] instanceof Date ? t[tkey].toISOString() : t[tkey]
        }
        return tobj
      })
    } else {
      serialized[key] = property[key] instanceof Date ? property[key].toISOString() : property[key]
    }
  }
  return serialized
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const property = await prisma.property.findUnique({
      where: { id },
      include: { temporadas: { orderBy: [{ order: 'asc' }, { startDate: 'asc' }] } },
    })

    if (!property) {
      return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 })
    }

    return NextResponse.json(serializeProperty(property))
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Extract temporadas and non-schema fields
    const { temporadas, currency, customType, coverIndex, published, ...data } = body

    // Map 'published' to 'active' if provided
    if (published !== undefined) {
      data.active = published
    }

    // Ensure 'image' (cover) is set — required by Prisma
    if (!data.image && data.images) {
      const urls = typeof data.images === 'string' ? data.images.split(',').filter(Boolean) : data.images
      data.image = urls[0] || ''
    }

    // Ensure images is a comma-separated string
    if (Array.isArray(data.images)) {
      data.images = data.images.join(',')
    }

    // Ensure extras and features are comma-separated strings
    if (Array.isArray(data.extras)) {
      data.extras = data.extras.join(',')
    }
    if (Array.isArray(data.features)) {
      data.features = data.features.join(',')
    }

    // Provide defaults for required float fields
    if (data.latitude === null || data.latitude === undefined) {
      data.latitude = -37.1067
    }
    if (data.longitude === null || data.longitude === undefined) {
      data.longitude = -56.8688
    }

    // Use a transaction to update property + temporadas atomically
    const property = await prisma.$transaction(async (tx) => {
      const updated = await tx.property.update({ where: { id }, data })

      // Handle temporadas
      if (data.operation === 'temporario' && temporadas && Array.isArray(temporadas) && temporadas.length > 0) {
        // Delete existing temporadas and recreate
        await tx.temporada.deleteMany({ where: { propertyId: id } })

        await Promise.all(
          temporadas.map((temp: any, index: number) =>
            tx.temporada.create({
              data: {
                name: temp.name || '',
                startDate: new Date(temp.startDate + 'T00:00:00'),
                endDate: new Date(temp.endDate + 'T00:00:00'),
                price: temp.price || '',
                currency: temp.currency || 'USD',
                available: temp.available !== false,
                order: index,
                propertyId: id,
              },
            })
          )
        )
      } else if (data.operation !== 'temporario' || (temporadas && temporadas.length === 0)) {
        // Not temporario anymore, or temporadas removed — delete all
        await tx.temporada.deleteMany({ where: { propertyId: id } })
      }

      // Return updated property with temporadas
      return tx.property.findUnique({
        where: { id },
        include: { temporadas: { orderBy: [{ order: 'asc' }, { startDate: 'asc' }] } },
      })
    })

    return NextResponse.json(serializeProperty(property))
  } catch (error: any) {
    console.error('Error updating property:', error)
    return NextResponse.json({ error: 'Error del servidor', details: error.message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    // Cascade delete will handle temporadas
    await prisma.property.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
