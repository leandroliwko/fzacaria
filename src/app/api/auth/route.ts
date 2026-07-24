import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Simple auth - login
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 })
    }

    const admin = await db.admin.findUnique({ where: { email } })

    if (!admin || admin.password !== password) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    return NextResponse.json({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: 'admin',
    })
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json({ error: 'Error de autenticación' }, { status: 500 })
  }
}

// Create default admin user
export async function PUT(request: NextRequest) {
  try {
    const existing = await db.admin.findFirst()
    if (existing) {
      return NextResponse.json({ error: 'Ya existe un usuario admin' }, { status: 400 })
    }

    const { email, password, name } = await request.json()

    const admin = await db.admin.create({
      data: {
        email: email || 'admin@florenciazacaria.com',
        password: password || 'admin123',
        name: name || 'Admin',
      },
    })

    return NextResponse.json({ id: admin.id, email: admin.email })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ error: 'Error creando usuario' }, { status: 500 })
  }
}
