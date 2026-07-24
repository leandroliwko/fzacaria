import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthStatus } from '@/lib/auth'

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
    const tasacion = await prisma.tasacionRequest.update({ where: { id }, data: body })

    return NextResponse.json(tasacion)
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
