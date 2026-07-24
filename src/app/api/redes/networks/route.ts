import { NextRequest, NextResponse } from 'next/server'
import { getAuthStatus } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Disable caching — admin pages need fresh data
export const dynamic = 'force-dynamic'

// GET - List all networks owned by this agency (created by current admin)
// Includes counts of pending/accepted connections
export async function GET() {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const networks = await prisma.network.findMany({
      where: { createdById: auth.email },
      include: {
        connections: {
          select: {
            id: true,
            status: true,
            inmoName: true,
            inmoEmail: true,
            inmoCity: true,
            message: true,
            createdAt: true,
            actionedAt: true,
            creator: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Compute summary stats per network
    const enriched = networks.map((n) => {
      const pending = n.connections.filter((c) => c.status === 'pending' && !c.creator).length
      const accepted = n.connections.filter((c) => c.status === 'accepted').length
      const rejected = n.connections.filter((c) => c.status === 'rejected').length
      return {
        ...n,
        pendingCount: pending,
        acceptedCount: accepted,
        rejectedCount: rejected,
      }
    })

    return NextResponse.json(
      { networks: enriched },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  } catch (error: any) {
    console.error('GET /api/redes/networks error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create a new network (the current admin becomes the creator)
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      description,
      type,
      feePercent,
      contactEmail,
      contactPhone,
      city,
    } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'El nombre de la red es requerido' }, { status: 400 })
    }

    // Validate feePercent
    const fee = Math.min(100, Math.max(0, parseInt(feePercent ?? '50', 10) || 50))

    // Fetch creator's name from Admin table
    const admin = await prisma.admin.findUnique({
      where: { email: auth.email },
      select: { name: true },
    })

    const network = await prisma.network.create({
      data: {
        name: name.trim(),
        description: (description || '').trim(),
        type: type === 'public' ? 'public' : 'private',
        feePercent: fee,
        contactEmail: (contactEmail || auth.email).trim(),
        contactPhone: (contactPhone || '').trim(),
        city: (city || '').trim(),
        createdById: auth.email,
        createdByName: admin?.name || auth.email,
        // Auto-create a "creator" connection so the agency is part of its own network
        connections: {
          create: [{
            inmoName: admin?.name || auth.email,
            inmoEmail: auth.email,
            inmoPhone: (contactPhone || '').trim(),
            inmoCity: (city || '').trim(),
            message: 'Creador de la red',
            status: 'accepted',
            creator: true,
            requestedById: auth.email,
            actionedAt: new Date(),
          }],
        },
      },
      include: { connections: true },
    })

    return NextResponse.json({ success: true, network })
  } catch (error: any) {
    console.error('POST /api/redes/networks error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
