import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthStatus } from '@/lib/auth'

export async function GET() {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const tasaciones = await prisma.tasacionRequest.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(tasaciones)
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Public endpoint - no auth required
    const body = await request.json()
    const tasacion = await prisma.tasacionRequest.create({ data: body })

    return NextResponse.json(tasacion, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
