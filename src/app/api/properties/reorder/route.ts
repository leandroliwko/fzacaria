import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthStatus } from '@/lib/auth'

/**
 * PATCH /api/properties/reorder
 *
 * Body: { items: [{ id: string, order: number }, ...] }
 *
 * Actualiza el campo `order` de varias propiedades en una transacción.
 * Solo admins autenticados.
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const items: Array<{ id: string; order: number }> = body?.items

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Se requiere un array "items" no vacío' }, { status: 400 })
    }

    // Validar cada item
    for (const item of items) {
      if (!item?.id || typeof item.order !== 'number') {
        return NextResponse.json(
          { error: 'Cada item debe tener { id: string, order: number }' },
          { status: 400 }
        )
      }
    }

    // Actualizar en transacción para que sea atómico
    await prisma.$transaction(
      items.map((item) =>
        prisma.property.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    )

    return NextResponse.json({ success: true, updated: items.length })
  } catch (error: any) {
    console.error('Error reordering properties:', error)
    return NextResponse.json(
      { error: 'Error del servidor', details: error.message },
      { status: 500 }
    )
  }
}
