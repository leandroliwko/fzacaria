import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthStatus } from '@/lib/auth'
import { getAuthUrl, getMLCredentials } from '@/lib/mercadolibre'

// GET - Check ML connection status and get auth URL
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Try to get credentials from DB first, then env
    const creds = await getMLCredentials()

    if (!creds) {
      // Check if there are partial settings in DB
      const settings = await prisma.mLSettings.findFirst()
      return NextResponse.json({
        connected: false,
        configured: false,
        hasDbSettings: !!settings,
        message: 'Falta configurar las credenciales de Mercado Libre. Ingresalas en la sección de configuración.',
      })
    }

    const token = await prisma.mercadoLibreToken.findFirst({
      orderBy: { createdAt: 'desc' },
    })

    if (!token) {
      const authUrl = getAuthUrl(creds.appId, creds.redirectUri)
      return NextResponse.json({
        connected: false,
        configured: true,
        authUrl,
      })
    }

    // Check if token is still valid
    const expiresAt = new Date(token.updatedAt.getTime() + token.expiresIn * 1000)
    const isExpired = new Date() > expiresAt

    if (isExpired) {
      // Token expired - return auth URL to reconnect
      const authUrl = getAuthUrl(creds.appId, creds.redirectUri)
      return NextResponse.json({
        connected: false,
        configured: true,
        authUrl,
        mlUserId: token.mlUserId,
        expiredAt: expiresAt.toISOString(),
      })
    }

    return NextResponse.json({
      connected: true,
      configured: true,
      mlUserId: token.mlUserId,
      expiresAt: expiresAt.toISOString(),
      canRefresh: !!token.refreshToken,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
