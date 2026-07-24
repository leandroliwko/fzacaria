import { NextResponse } from 'next/server'
import { getAuthStatus } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated || !auth.email) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    const admin = await prisma.admin.findUnique({ where: { email: auth.email } })
    if (!admin) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    // If account was deactivated after login, force logout
    if (admin.active === false) {
      return NextResponse.json({ authenticated: false, reason: 'account_disabled' }, { status: 401 })
    }

    return NextResponse.json({
      authenticated: true,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role || 'editor',
        phone: admin.phone || '',
      },
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}
