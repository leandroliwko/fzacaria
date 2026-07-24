import { NextResponse } from 'next/server'
import { getAuthStatus } from '@/lib/auth'
import { logoutFromPixel } from '@/lib/pixelinmobiliario'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    await logoutFromPixel()

    return NextResponse.json(
      { success: true },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    )
  } catch (error: any) {
    console.error('POST /api/pixelinmobiliario/auth/logout error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
