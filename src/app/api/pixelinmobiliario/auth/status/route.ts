import { NextResponse } from 'next/server'
import { getAuthStatus } from '@/lib/auth'
import { getPixelStatus } from '@/lib/pixelinmobiliario'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const status = await getPixelStatus()

    return NextResponse.json(
      status,
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    )
  } catch (error: any) {
    console.error('GET /api/pixelinmobiliario/auth/status error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
