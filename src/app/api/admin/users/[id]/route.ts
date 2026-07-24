import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthStatus } from '@/lib/auth'
import { hashPassword, verifyPassword } from '@/lib/password'

/**
 * Get the current authenticated admin from the database (with role).
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

// GET /api/admin/users/[id] — get one user (superadmin only, or self)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const current = await getCurrentAdmin()
    if (!current) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Self can read own profile; superadmin can read anyone
    if (current.id !== id && current.role !== 'superadmin') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    const user = await prisma.admin.findUnique({
      where: { id },
      include: { _count: { select: { properties: true } } },
    })
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    return NextResponse.json(serializeAdmin(user))
  } catch (error: any) {
    console.error('Error getting user:', error)
    return NextResponse.json({ error: 'Error del servidor', details: error.message }, { status: 500 })
  }
}

// PATCH /api/admin/users/[id] — update user
// Superadmin can edit anyone; regular users can edit only themselves (with restrictions)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const current = await getCurrentAdmin()
    if (!current) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, email, password, currentPassword, role, active, phone } = body

    // Fetch target user
    const target = await prisma.admin.findUnique({ where: { id } })
    if (!target) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const isSelf = current.id === target.id
    const isSuperadmin = current.role === 'superadmin'

    // Permission check
    if (!isSelf && !isSuperadmin) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    // Build update data
    const updateData: any = {}

    // Name
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return NextResponse.json({ error: 'El nombre debe tener al menos 2 caracteres' }, { status: 400 })
      }
      updateData.name = name.trim()
    }

    // Email
    if (email !== undefined) {
      const normalizedEmail = (email as string).toLowerCase().trim()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
      }
      // Check uniqueness if changing
      if (normalizedEmail !== target.email) {
        const existing = await prisma.admin.findUnique({ where: { email: normalizedEmail } })
        if (existing) {
          return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 })
        }
      }
      updateData.email = normalizedEmail
    }

    // Phone
    if (phone !== undefined) {
      updateData.phone = (phone as string)?.trim() || null
    }

    // Password change
    if (password !== undefined && password !== '') {
      if (typeof password !== 'string' || password.length < 6) {
        return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
      }
      // If user is changing their OWN password, require current password verification
      if (isSelf && !isSuperadmin) {
        if (!currentPassword) {
          return NextResponse.json({ error: 'Debes ingresar tu contraseña actual' }, { status: 400 })
        }
        const validCurrent = await verifyPassword(currentPassword, target.password)
        if (!validCurrent) {
          return NextResponse.json({ error: 'Contraseña actual incorrecta' }, { status: 400 })
        }
      }
      updateData.password = await hashPassword(password)
    }

    // Role — only superadmin can change roles
    if (role !== undefined) {
      if (!isSuperadmin) {
        return NextResponse.json({ error: 'Solo el superadmin puede cambiar roles' }, { status: 403 })
      }
      updateData.role = role === 'superadmin' ? 'superadmin' : 'editor'
    }

    // Active status — only superadmin can activate/deactivate
    if (active !== undefined) {
      if (!isSuperadmin) {
        return NextResponse.json({ error: 'Solo el superadmin puede activar/desactivar usuarios' }, { status: 403 })
      }
      // Prevent superadmin from deactivating themselves (would lock out)
      if (isSelf && active === false) {
        return NextResponse.json({ error: 'No podés desactivar tu propia cuenta' }, { status: 400 })
      }
      updateData.active = Boolean(active)
    }

    // Prevent the last superadmin from being demoted or deactivated
    if (target.role === 'superadmin' && (updateData.role === 'editor' || updateData.active === false)) {
      const superadminCount = await prisma.admin.count({ where: { role: 'superadmin', active: true } })
      if (superadminCount <= 1) {
        return NextResponse.json({
          error: 'No se puede demover o desactivar al último superadmin. Asigná otro superadmin primero.',
        }, { status: 400 })
      }
    }

    // Prevent self-demotion of superadmin (would lock out)
    if (isSelf && isSuperadmin && updateData.role === 'editor') {
      const superadminCount = await prisma.admin.count({ where: { role: 'superadmin', active: true } })
      if (superadminCount <= 1) {
        return NextResponse.json({
          error: 'No podés quitarte el rol superadmin porque sos el único. Asigná otro superadmin primero.',
        }, { status: 400 })
      }
    }

    const updated = await prisma.admin.update({
      where: { id },
      data: updateData,
      include: { _count: { select: { properties: true } } },
    })

    return NextResponse.json(serializeAdmin(updated))
  } catch (error: any) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Error del servidor', details: error.message }, { status: 500 })
  }
}

// DELETE /api/admin/users/[id] — delete user (superadmin only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const current = await getCurrentAdmin()
    if (!current) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (current.role !== 'superadmin') {
      return NextResponse.json({ error: 'Permisos insuficientes. Solo superadmin.' }, { status: 403 })
    }

    const { id } = await params

    // Prevent self-deletion
    if (current.id === id) {
      return NextResponse.json({ error: 'No podés eliminar tu propia cuenta' }, { status: 400 })
    }

    const target = await prisma.admin.findUnique({ where: { id } })
    if (!target) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Prevent deleting the last superadmin
    if (target.role === 'superadmin') {
      const superadminCount = await prisma.admin.count({ where: { role: 'superadmin', active: true } })
      if (superadminCount <= 1) {
        return NextResponse.json({
          error: 'No se puede eliminar al último superadmin. Asigná otro superadmin primero.',
        }, { status: 400 })
      }
    }

    // Delete user — their properties will have createdById set to NULL (SetNull in schema)
    await prisma.admin.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Usuario eliminado. Sus propiedades quedan asignadas a "sin dueño".' })
  } catch (error: any) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Error del servidor', details: error.message }, { status: 500 })
  }
}
