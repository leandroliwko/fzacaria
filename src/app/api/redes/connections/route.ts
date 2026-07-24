import { NextRequest, NextResponse } from 'next/server'
import { getAuthStatus } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - List pending connection requests across all networks owned by current admin
export async function GET() {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Find all networks owned by this admin
    const myNetworks = await prisma.network.findMany({
      where: { createdById: auth.email },
      select: { id: true },
    })
    const myNetworkIds = myNetworks.map((n) => n.id)

    if (myNetworkIds.length === 0) {
      return NextResponse.json(
        { pending: [], accepted: [], rejected: [], stats: { pending: 0, accepted: 0, rejected: 0 } },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      )
    }

    // Get all connections for my networks (excluding creator auto-entries)
    const connections = await prisma.networkConnection.findMany({
      where: {
        networkId: { in: myNetworkIds },
        creator: false,
      },
      include: {
        network: {
          select: { id: true, name: true, city: true, feePercent: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const pending = connections.filter((c) => c.status === 'pending')
    const accepted = connections.filter((c) => c.status === 'accepted')
    const rejected = connections.filter((c) => c.status === 'rejected' || c.status === 'cancelled')

    return NextResponse.json(
      {
        pending,
        accepted,
        rejected,
        stats: {
          pending: pending.length,
          accepted: accepted.length,
          rejected: rejected.length,
          total: connections.length,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  } catch (error: any) {
    console.error('GET /api/redes/connections error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Submit a connection request to JOIN a network (by networkId in body)
// Used by external/public form OR by admin to join another network.
// In this single-agency setup, we mainly use it to add another agency to OUR network.
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      networkId,
      inmoName,
      inmoEmail,
      inmoPhone,
      inmoCity,
      inmoMatricula,
      message,
    } = body

    if (!networkId) {
      return NextResponse.json({ error: 'networkId es requerido' }, { status: 400 })
    }
    if (!inmoName || !inmoName.trim()) {
      return NextResponse.json({ error: 'Nombre de la inmobiliaria es requerido' }, { status: 400 })
    }
    if (!inmoEmail || !inmoEmail.trim()) {
      return NextResponse.json({ error: 'Email de contacto es requerido' }, { status: 400 })
    }

    // Verify network exists
    const network = await prisma.network.findUnique({ where: { id: networkId } })
    if (!network) {
      return NextResponse.json({ error: 'Red no encontrada' }, { status: 404 })
    }

    // Prevent duplicate pending requests to the same network
    const existing = await prisma.networkConnection.findFirst({
      where: {
        networkId,
        inmoEmail: inmoEmail.trim().toLowerCase(),
        status: 'pending',
      },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una solicitud pendiente desde este email para esta red' },
        { status: 409 }
      )
    }

    const connection = await prisma.networkConnection.create({
      data: {
        networkId,
        inmoName: inmoName.trim(),
        inmoEmail: inmoEmail.trim().toLowerCase(),
        inmoPhone: (inmoPhone || '').trim(),
        inmoCity: (inmoCity || '').trim(),
        inmoMatricula: (inmoMatricula || '').trim(),
        message: (message || '').trim(),
        status: 'pending',
        creator: false,
        requestedById: auth.email,
      },
    })

    return NextResponse.json({ success: true, connection })
  } catch (error: any) {
    console.error('POST /api/redes/connections error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
