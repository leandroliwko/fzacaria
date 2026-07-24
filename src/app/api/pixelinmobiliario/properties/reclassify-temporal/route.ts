import { NextRequest, NextResponse } from 'next/server'
import { getAuthStatus } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ============================================================
// POST /api/pixelinmobiliario/properties/reclassify-temporal
//
// One-shot migration endpoint that reclassifies any Pixel-imported
// property whose operation is "alquiler" to operation = "temporario"
// (alquiler temporal).
//
// Matching strategy (precise — based on operation field only, NOT
// on title/description, to avoid false positives where a VENTA
// property mentions "alquiler" in its description):
//   1. code starts with "PIXEL-"            (only Pixel imports)
//   2. AND operation = 'alquiler'
//
// Returns: { matched, updated, sample }
// ============================================================

export async function POST(_request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated || !auth.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Find candidates: Pixel-imported properties whose operation is "alquiler".
    // We intentionally do NOT match on title/description to avoid catching
    // VENTA properties that mention "alquiler" in their body text.
    const candidates = await prisma.property.findMany({
      where: {
        AND: [
          { code: { startsWith: 'PIXEL-' } },
          { operation: { equals: 'alquiler', mode: 'insensitive' } },
        ],
      },
      select: { id: true, code: true, title: true, operation: true },
    })

    if (!candidates.length) {
      return NextResponse.json({
        success: true,
        matched: 0,
        updated: 0,
        message: 'No se encontraron propiedades de Pixel con operation=alquiler para reclasificar.',
      })
    }

    // Bulk update all matched properties to operation = "temporario"
    const result = await prisma.property.updateMany({
      where: { id: { in: candidates.map((c) => c.id) } },
      data: { operation: 'temporario' },
    })

    return NextResponse.json({
      success: true,
      matched: candidates.length,
      updated: result.count,
      sample: candidates.slice(0, 10).map((c) => ({
        id: c.id,
        code: c.code,
        title: c.title,
        previousOperation: c.operation,
        newOperation: 'temporario',
      })),
    })
  } catch (error: any) {
    console.error('POST /api/pixelinmobiliario/properties/reclassify-temporal error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
