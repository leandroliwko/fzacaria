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

// Auto-generate property code: abbreviation of type + next number >= 35
function generatePropertyCode(type: string, existingCodes: string[]): string {
  const typeMap: Record<string, string> = {
    casa: 'CA', departamento: 'DE', chalet: 'CH', ph: 'PH',
    lote: 'LO', local: 'LC', campo: 'CA', oficina: 'OF',
    quinta: 'QU', hotel: 'HO',
  }
  const prefix = typeMap[type?.toLowerCase()] || 'PR'

  // Find the highest number used with this prefix
  const usedNumbers = existingCodes
    .filter(c => c.startsWith(prefix))
    .map(c => parseInt(c.replace(prefix, ''), 10))
    .filter(n => !isNaN(n))

  const nextNum = usedNumbers.length > 0 ? Math.max(...usedNumbers) + 1 : 35
  return `${prefix}${nextNum}`
}

export async function GET() {
  try {
    const auth = await getAuthStatus()

    // Public: only active properties. Admin: all properties.
    const where = auth.authenticated ? {} : { active: true }

    const properties = await prisma.property.findMany({
      where,
      // Both admin AND public use the manual order from the panel.
      // Ties broken by featured first, then newest.
      orderBy: [{ order: 'asc' }, { featured: 'desc' }, { createdAt: 'desc' }],
      include: {
        temporadas: { orderBy: [{ order: 'asc' }, { startDate: 'asc' }] },
        // Only include creator info when authenticated (admin view)
        ...(auth.authenticated ? { createdBy: { select: { id: true, name: true, email: true } } } : {}),
      },
    })

    // Migration: assign codes to properties that still have "PENDING"
    const pendingProperties = properties.filter((p: any) => p.code === 'PENDING')
    if (pendingProperties.length > 0) {
      const allCodes = properties.map((p: any) => p.code).filter((c: string) => c !== 'PENDING')
      for (const prop of pendingProperties) {
        const newCode = generatePropertyCode(prop.type, allCodes)
        await prisma.property.update({ where: { id: prop.id }, data: { code: newCode } })
        allCodes.push(newCode)
        // Update in-memory object too
        ;(prop as any).code = newCode
      }
    }

    const serialized = properties.map((p: any) => serializeProperty(p))

    // Prevent browser/CDN caching for admin data — always return fresh data
    return NextResponse.json(serialized, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated || !auth.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Resolve the current admin user (to assign createdById)
    const currentUser = await prisma.admin.findUnique({ where: { email: auth.email } })
    if (!currentUser || currentUser.active === false) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()

    // Extract temporadas array (saved in the same transaction)
    const { temporadas, currency, customType, coverIndex, published, ...data } = body

    // Assign property to the user creating it
    data.createdById = currentUser.id

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

    // Auto-generate property code
    const existingProperties = await prisma.property.findMany({ select: { code: true } })
    const existingCodes = existingProperties.map(p => p.code).filter(c => c !== 'PENDING')
    data.code = generatePropertyCode(data.type, existingCodes)

    // New property goes FIRST in the list: set order = 0 and shift all
    // existing properties up by 1, so manual ordering is preserved.
    await prisma.property.updateMany({ data: { order: { increment: 1 } } })
    data.order = 0

    // Use a transaction to create property + temporadas atomically
    const property = await prisma.$transaction(async (tx) => {
      const newProperty = await tx.property.create({ data })

      // Create temporadas if provided and operation is temporario
      if (data.operation === 'temporario' && temporadas && Array.isArray(temporadas) && temporadas.length > 0) {
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
                propertyId: newProperty.id,
              },
            })
          )
        )
      }

      // Return the property with temporadas
      return tx.property.findUnique({
        where: { id: newProperty.id },
        include: { temporadas: { orderBy: [{ order: 'asc' }, { startDate: 'asc' }] } },
      })
    })

    return NextResponse.json(serializeProperty(property), { status: 201 })
  } catch (error: any) {
    console.error('Error creating property:', error)
    return NextResponse.json({ error: 'Error del servidor', details: error.message }, { status: 500 })
  }
}
