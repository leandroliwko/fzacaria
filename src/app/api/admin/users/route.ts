import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthStatus } from '@/lib/auth'
import { hashPassword } from '@/lib/password'

/**
 * Get the current authenticated admin from the database (with role).
 * Returns null if not authenticated or admin no longer exists.
 */
async function getCurrentAdmin() {
  const auth = await getAuthStatus()
  if (!auth.authenticated || !auth.email) return null
  const admin = await prisma.admin.findUnique({ where: { email: auth.email } })
  if (!admin || admin.active === false) return null
  return admin
}

function serializeAdmin(admin: any) {
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    active: admin.active,
    phone: admin.phone || '',
    lastLoginAt: admin.lastLoginAt ? admin.lastLoginAt.toISOString() : null,
    createdAt: admin.createdAt.toISOString(),
    updatedAt: admin.updatedAt.toISOString(),
    _count: admin._count || { properties: 0 },
  }
}

// GET /api/admin/users — list all users (superadmin only)
export async function GET() {
  try {
    const current = await getCurrentAdmin()
    if (!current) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (current.role !== 'superadmin') {
      return NextResponse.json({ error: 'Permisos insuficientes. Solo superadmin.' }, { status: 403 })
    }

    const users = await prisma.admin.findMany({
      orderBy: [{ role: 'desc' }, { createdAt: 'asc' }],
      include: {
        _count: { select: { properties: true } },
      },
    })

    // Prevent browser/CDN caching for admin data — always return fresh data
    return NextResponse.json(users.map(serializeAdmin), {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error: any) {
    console.error('Error listing users:', error)
    return NextResponse.json({ error: 'Error del servidor', details: error.message }, { status: 500 })
  }
}

// POST /api/admin/users — create new user (superadmin only)
export async function POST(request: NextRequest) {
  try {
    const current = await getCurrentAdmin()
    if (!current) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (current.role !== 'superadmin') {
      return NextResponse.json({ error: 'Permisos insuficientes. Solo superadmin.' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password, role, phone, active } = body

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'El nombre es requerido (mínimo 2 caracteres)' }, { status: 400 })
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    // Validate role
    const finalRole = role === 'superadmin' ? 'superadmin' : 'editor'

    // Check email is not already in use
    const normalizedEmail = email.toLowerCase().trim()
    const existing = await prisma.admin.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 })
    }

    const hashedPassword = await hashPassword(password)

    const newAdmin = await prisma.admin.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: finalRole,
        phone: phone?.trim() || null,
        active: active !== false,
      },
      include: { _count: { select: { properties: true } } },
    })

    return NextResponse.json(serializeAdmin(newAdmin), { status: 201 })
  } catch (error: any) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Error del servidor', details: error.message }, { status: 500 })
  }
}
