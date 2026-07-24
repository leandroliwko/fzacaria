import { NextResponse } from 'next/server'
import { getAuthStatus } from '@/lib/auth'
import { getConnections, sendConnectionRequest } from '@/lib/pixelinmobiliario'

export const dynamic = 'force-dynamic'

// GET /api/pixelinmobiliario/connections
export async function GET() {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const connections = await getConnections()

    return NextResponse.json(
      connections,
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    )
  } catch (error: any) {
    console.error('GET /api/pixelinmobiliario/connections error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/pixelinmobiliario/connections
// Body: { selected_inmo_id, network_id, message }
export async function POST(request: Request) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { selected_inmo_id, network_id, message } = await request.json()
    if (!selected_inmo_id || !network_id) {
      return NextResponse.json({ error: 'selected_inmo_id y network_id son requeridos' }, { status: 400 })
    }

    const result = await sendConnectionRequest({
      selected_inmo_id: Number(selected_inmo_id),
      network_id: Number(network_id),
      message: message || '',
    })

    return NextResponse.json(
      { success: true, result },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    )
  } catch (error: any) {
    console.error('POST /api/pixelinmobiliario/connections error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
