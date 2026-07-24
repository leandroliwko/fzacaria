import { NextRequest, NextResponse } from 'next/server'
import { getAuthStatus } from '@/lib/auth'
import { getInmoList } from '@/lib/pixelinmobiliario'

export const dynamic = 'force-dynamic'

// GET /api/pixelinmobiliario/inmos?page=1&per_page=20
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const perPage = parseInt(searchParams.get('per_page') || '20', 10)

    const data = await getInmoList(page, perPage)

    return NextResponse.json(
      data,
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    )
  } catch (error: any) {
    console.error('GET /api/pixelinmobiliario/inmos error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
