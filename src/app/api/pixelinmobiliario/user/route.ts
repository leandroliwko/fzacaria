import { NextResponse } from 'next/server'
import { getAuthStatus } from '@/lib/auth'
import { getPixelStatus } from '@/lib/pixelinmobiliario'

export const dynamic = 'force-dynamic'

// GET /api/pixelinmobiliario/user
// Returns the cached Pixel Inmobiliario user snapshot
export async function GET() {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const status = await getPixelStatus()
    if (!status.authenticated) {
      return NextResponse.json({ error: 'No hay sesión activa en Pixel Inmobiliario' }, { status: 401 })
    }

    return NextResponse.json(
      { user: status.user },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    )
  } catch (error: any) {
    console.error('GET /api/pixelinmobiliario/user error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
