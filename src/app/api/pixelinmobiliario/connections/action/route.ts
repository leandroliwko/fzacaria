import { NextRequest, NextResponse } from 'next/server'
import { getAuthStatus } from '@/lib/auth'
import { actionOnRequest } from '@/lib/pixelinmobiliario'

export const dynamic = 'force-dynamic'

// POST /api/pixelinmobiliario/connections/action
// Body: { connectionId, action }
// action: 'accepted' | 'rejected' | 'cancelled'
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { connectionId, action } = await request.json()
    if (!connectionId || !action) {
      return NextResponse.json({ error: 'connectionId y action son requeridos' }, { status: 400 })
    }
    if (!['accepted', 'rejected', 'cancelled'].includes(action)) {
      return NextResponse.json({ error: 'action inválido' }, { status: 400 })
    }

    const result = await actionOnRequest(Number(connectionId), action)

    return NextResponse.json(
      { success: true, result },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    )
  } catch (error: any) {
    console.error('POST /api/pixelinmobiliario/connections/action error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
