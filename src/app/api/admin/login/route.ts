import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken, createTokenCookie } from '@/lib/auth'
import { verifyPassword } from '@/lib/password'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 })
    }

    const admin = await prisma.admin.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (!admin) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    // Check if user account is active
    if (admin.active === false) {
      return NextResponse.json({ error: 'Tu cuenta está desactivada. Contactá al administrador.' }, { status: 403 })
    }

    const valid = await verifyPassword(password, admin.password)
    if (!valid) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    // Update lastLoginAt timestamp (don't block login if this fails)
    try {
      await prisma.admin.update({
        where: { id: admin.id },
        data: { lastLoginAt: new Date() },
      })
    } catch {
      // non-critical
    }

    const token = generateToken(admin.email)
    const cookie = createTokenCookie(token)

    const response = NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role || 'editor',
      },
    })

    response.cookies.set(cookie)
    return response
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
