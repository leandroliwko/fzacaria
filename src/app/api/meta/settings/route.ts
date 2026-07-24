import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthStatus } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET - Retrieve Meta settings (secret masked).
export async function GET() {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const settings = await prisma.metaSettings.findFirst()
    if (!settings) {
      return NextResponse.json({
        configured: false,
        appId: '',
        appSecret: '',
        appSecretSet: false,
        redirectUri: 'https://fzacaria.com.ar/api/meta/auth/callback',
      })
    }

    return NextResponse.json({
      configured: !!(settings.appId && settings.appSecret),
      appId: settings.appId,
      appSecret: settings.appSecret
        ? '*'.repeat(Math.max(0, settings.appSecret.length - 4)) + settings.appSecret.slice(-4)
        : '',
      appSecretSet: !!settings.appSecret,
      redirectUri: settings.redirectUri,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT - Save Meta app credentials.
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { appId, appSecret, redirectUri } = body

    if (!appId || !appSecret) {
      return NextResponse.json(
        { error: 'App ID y App Secret son requeridos' },
        { status: 400 }
      )
    }

    const existing = await prisma.metaSettings.findFirst()
    let settings
    if (existing) {
      settings = await prisma.metaSettings.update({
        where: { id: existing.id },
        data: {
          appId,
          appSecret,
          redirectUri: redirectUri || existing.redirectUri,
        },
      })
    } else {
      settings = await prisma.metaSettings.create({
        data: {
          appId,
          appSecret,
          redirectUri: redirectUri || 'https://fzacaria.com.ar/api/meta/auth/callback',
        },
      })
    }

    // Reset existing tokens — credentials changed, so tokens are no longer valid.
    await prisma.metaToken.deleteMany().catch(() => {})

    return NextResponse.json({
      success: true,
      configured: true,
      appId: settings.appId,
      appSecret:
        '*'.repeat(Math.max(0, settings.appSecret.length - 4)) + settings.appSecret.slice(-4),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Remove Meta settings + all tokens.
export async function DELETE() {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    await prisma.metaToken.deleteMany().catch(() => {})
    await prisma.metaSettings.deleteMany().catch(() => {})

    return NextResponse.json({ success: true, message: 'Configuración de Meta eliminada' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
