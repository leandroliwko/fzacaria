import { NextRequest, NextResponse } from 'next/server'
import { getAuthStatus } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// PUT - Update a network (only owner)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Verify ownership
    const existing = await prisma.network.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Red no encontrada' }, { status: 404 })
    }
    if (existing.createdById !== auth.email) {
      return NextResponse.json({ error: 'Solo el creador puede editar esta red' }, { status: 403 })
    }

    const fee = body.feePercent != null
      ? Math.min(100, Math.max(0, parseInt(body.feePercent, 10) || 50))
      : existing.feePercent

    const updated = await prisma.network.update({
      where: { id },
      data: {
        name: body.name?.trim() || existing.name,
        description: body.description != null ? body.description.trim() : existing.description,
        type: body.type === 'public' ? 'public' : body.type === 'private' ? 'private' : existing.type,
        feePercent: fee,
        contactEmail: body.contactEmail?.trim() || existing.contactEmail,
        contactPhone: body.contactPhone != null ? body.contactPhone.trim() : existing.contactPhone,
        city: body.city != null ? body.city.trim() : existing.city,
        active: body.active != null ? !!body.active : existing.active,
      },
    })

    return NextResponse.json({ success: true, network: updated })
  } catch (error: any) {
    console.error('PUT /api/redes/networks/[id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Delete a network (only owner) — cascades to connections
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

    // Verify ownership
    const existing = await prisma.network.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Red no encontrada' }, { status: 404 })
    }
    if (existing.createdById !== auth.email) {
      return NextResponse.json({ error: 'Solo el creador puede eliminar esta red' }, { status: 403 })
    }

    await prisma.network.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Red eliminada' })
  } catch (error: any) {
    console.error('DELETE /api/redes/networks/[id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
