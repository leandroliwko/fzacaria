import { NextRequest, NextResponse } from 'next/server'
import { getAuthStatus } from '@/lib/auth'
import { getMyProperties } from '@/lib/pixelinmobiliario'

export const dynamic = 'force-dynamic'

// GET /api/pixelinmobiliario/properties?page=1&per_page=20
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') || '20', 10) || 20))

    const result = await getMyProperties(page, perPage)

    return NextResponse.json(
      result,
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    )
  } catch (error: any) {
    console.error('GET /api/pixelinmobiliario/properties error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
