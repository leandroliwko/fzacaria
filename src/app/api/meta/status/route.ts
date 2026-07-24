import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthStatus } from '@/lib/auth'
import { getMetaCredentials, getAuthUrl } from '@/lib/meta'

export const dynamic = 'force-dynamic'

// GET - Check Meta connection status and return OAuth URL if not connected.
export async function GET() {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const creds = await getMetaCredentials()

    if (!creds) {
      const settings = await prisma.metaSettings.findFirst().catch(() => null)
      return NextResponse.json({
        connected: false,
        configured: false,
        hasDbSettings: !!settings,
        message:
          'Falta configurar las credenciales de Meta (App ID y App Secret). Ingresalas en la sección de configuración.',
      })
    }

    const token = await prisma.metaToken.findFirst({
      where: { active: true },
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

    const isExpired = new Date() > token.expiresAt
    const hasPage = !!(token.pageId && token.pageAccessToken)
    const hasIg = !!token.igBusinessAccountId

    return NextResponse.json({
      connected: !isExpired && hasPage,
      configured: true,
      expired: isExpired,
      hasPage,
      hasIg,
      pageName: token.pageName,
      pageId: token.pageId,
      igUsername: token.igUsername,
      igBusinessAccountId: token.igBusinessAccountId,
      userName: token.userName,
      userEmail: token.userEmail,
      expiresAt: token.expiresAt.toISOString(),
      daysUntilExpiry: Math.max(
        0,
        Math.ceil((token.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      ),
    })
  } catch (error: any) {
    console.error('GET /api/meta/status error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
