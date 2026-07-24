import { NextRequest, NextResponse } from 'next/server'
import { getAuthStatus } from '@/lib/auth'
import { loginToPixel } from '@/lib/pixelinmobiliario'

export const dynamic = 'force-dynamic'

// POST /api/pixelinmobiliario/auth/login
// Body: { email, password }
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'email y password son requeridos' }, { status: 400 })
    }

    const { user } = await loginToPixel(email, password)

    return NextResponse.json(
      { success: true, user },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    )
  } catch (error: any) {
    console.error('POST /api/pixelinmobiliario/auth/login error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
