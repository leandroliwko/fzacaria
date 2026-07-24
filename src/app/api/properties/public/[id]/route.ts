import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Public endpoint: returns a single active property by ID (no auth required)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const property = await prisma.property.findUnique({
      where: { id },
      include: { temporadas: { orderBy: [{ order: 'asc' }, { startDate: 'asc' }] } },
    })

    if (!property || !property.active) {
      return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 })
    }

    // Serialize dates for JSON
    const serialized: any = {}
    for (const key of Object.keys(property)) {
      if (key === 'temporadas' && Array.isArray((property as any)[key])) {
        serialized[key] = (property as any)[key].map((t: any) => {
          const tobj: any = {}
          for (const tkey of Object.keys(t)) {
            tobj[tkey] = t[tkey] instanceof Date ? t[tkey].toISOString() : t[tkey]
          }
          return tobj
        })
      } else {
        serialized[key] = (property as any)[key] instanceof Date ? (property as any)[key].toISOString() : (property as any)[key]
      }
    }

    return NextResponse.json(serialized)
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
