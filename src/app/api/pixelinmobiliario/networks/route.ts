import { NextResponse } from 'next/server'
import { getAuthStatus } from '@/lib/auth'
import { getMyNetworks, createNetwork, deleteNetwork } from '@/lib/pixelinmobiliario'

export const dynamic = 'force-dynamic'

// GET /api/pixelinmobiliario/networks
export async function GET() {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const networks = await getMyNetworks()

    return NextResponse.json(
      { networks },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    )
  } catch (error: any) {
    console.error('GET /api/pixelinmobiliario/networks error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/pixelinmobiliario/networks
// Body: { title, description?, type? }
export async function POST(request: Request) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { title, description, type } = await request.json()
    if (!title) {
      return NextResponse.json({ error: 'title es requerido' }, { status: 400 })
    }

    const result = await createNetwork({ title, description, type })

    return NextResponse.json(
      { success: true, result },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    )
  } catch (error: any) {
    console.error('POST /api/pixelinmobiliario/networks error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/pixelinmobiliario/networks?id=123
export async function DELETE(request: Request) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const idStr = searchParams.get('id')
    if (!idStr) return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
    const id = parseInt(idStr, 10)
    if (isNaN(id)) return NextResponse.json({ error: 'id inválido' }, { status: 400 })

    const result = await deleteNetwork(id)

    return NextResponse.json(
      { success: true, result },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    )
  } catch (error: any) {
    console.error('DELETE /api/pixelinmobiliario/networks error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
