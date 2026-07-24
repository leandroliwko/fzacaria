import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthStatus } from '@/lib/auth'

// GET /api/temporadas?propertyId=xxx — Get all temporadas for a property
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')

    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId es requerido' }, { status: 400 })
    }

    const temporadas = await prisma.temporada.findMany({
      where: { propertyId },
      orderBy: [{ order: 'asc' }, { startDate: 'asc' }],
    })

    // Serialize dates
    const serialized = temporadas.map((t: any) => {
      const obj: any = {}
      for (const key of Object.keys(t)) {
        obj[key] = t[key] instanceof Date ? t[key].toISOString() : t[key]
      }
      return obj
    })

    return NextResponse.json(serialized)
  } catch (error: any) {
    console.error('Error fetching temporadas:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// POST /api/temporadas — Create a new temporada (or batch save)
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()

    // Support batch save: { propertyId, temporadas: [...] }
    if (body.temporadas && Array.isArray(body.temporadas)) {
      const { propertyId, temporadas } = body

      // Verify property exists
      const property = await prisma.property.findUnique({ where: { id: propertyId } })
      if (!property) {
        return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 })
      }

      // Delete existing temporadas for this property
      await prisma.temporada.deleteMany({ where: { propertyId } })

      // Create new temporadas
      const created = await Promise.all(
        temporadas.map((temp: any, index: number) =>
          prisma.temporada.create({
            data: {
              name: temp.name,
              startDate: new Date(temp.startDate + 'T00:00:00'),
              endDate: new Date(temp.endDate + 'T00:00:00'),
              price: temp.price || '',
              currency: temp.currency || 'USD',
              available: temp.available !== false,
              order: index,
              propertyId,
            },
          })
        )
      )

      // Serialize
      const serialized = created.map((t: any) => {
        const obj: any = {}
        for (const key of Object.keys(t)) {
          obj[key] = t[key] instanceof Date ? t[key].toISOString() : t[key]
        }
        return obj
      })

      return NextResponse.json(serialized, { status: 201 })
    }

    // Single create
    const { name, startDate, endDate, price, available, propertyId } = body

    if (!name || !startDate || !endDate || !propertyId) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Get next order
    const maxOrder = await prisma.temporada.aggregate({
      where: { propertyId },
      _max: { order: true },
    })

    const temporada = await prisma.temporada.create({
      data: {
        name,
        startDate: new Date(startDate + 'T00:00:00'),
        endDate: new Date(endDate + 'T00:00:00'),
        price: price || '',
        currency: body.currency || 'USD',
        available: available !== false,
        order: (maxOrder._max.order || 0) + 1,
        propertyId,
      },
    })

    const serialized: any = {}
    for (const key of Object.keys(temporada)) {
      serialized[key] = (temporada as any)[key] instanceof Date ? (temporada as any)[key].toISOString() : (temporada as any)[key]
    }

    return NextResponse.json(serialized, { status: 201 })
  } catch (error: any) {
    console.error('Error creating temporada:', error)
    return NextResponse.json({ error: 'Error del servidor', details: error.message }, { status: 500 })
  }
}

// DELETE /api/temporadas?propertyId=xxx — Delete all temporadas for a property
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')

    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId es requerido' }, { status: 400 })
    }

    await prisma.temporada.deleteMany({ where: { propertyId } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting temporadas:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
