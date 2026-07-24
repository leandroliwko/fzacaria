import { NextRequest, NextResponse } from 'next/server'
import { getAuthStatus } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST - Take action on a connection request (accept/reject/cancel)
// Body: { action: 'accepted' | 'rejected' | 'cancelled', notes?: string }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const { action, notes } = await request.json()

    if (!['accepted', 'rejected', 'cancelled'].includes(action)) {
      return NextResponse.json(
        { error: 'Acción inválida. Debe ser: accepted, rejected o cancelled' },
        { status: 400 }
      )
    }

    // Find the connection
    const connection = await prisma.networkConnection.findUnique({
      where: { id },
      include: { network: true },
    })

    if (!connection) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }

    // Verify ownership of the network (only network owner can accept/reject)
    if (connection.network.createdById !== auth.email) {
      return NextResponse.json(
        { error: 'Solo el creador de la red puede gestionar esta solicitud' },
        { status: 403 }
      )
    }

    // Prevent re-actioning already-decided requests
    if (connection.status !== 'pending') {
      return NextResponse.json(
        {
          error: `Esta solicitud ya fue ${connection.status}. No se puede volver a procesar.`,
        },
        { status: 400 }
      )
    }

    const updated = await prisma.networkConnection.update({
      where: { id },
      data: {
        status: action,
        actionedAt: new Date(),
        actionNotes: (notes || '').trim(),
      },
    })

    return NextResponse.json({ success: true, connection: updated })
  } catch (error: any) {
    console.error('POST /api/redes/connections/[id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Remove a connection (only owner, only for non-creator entries)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const connection = await prisma.networkConnection.findUnique({
      where: { id },
      include: { network: true },
    })

    if (!connection) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }

    if (connection.network.createdById !== auth.email) {
      return NextResponse.json(
        { error: 'Solo el creador de la red puede eliminar esta solicitud' },
        { status: 403 }
      )
    }

    if (connection.creator) {
      return NextResponse.json(
        { error: 'No se puede eliminar al creador de la red' },
        { status: 400 }
      )
    }

    await prisma.networkConnection.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Solicitud eliminada' })
  } catch (error: any) {
    console.error('DELETE /api/redes/connections/[id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
