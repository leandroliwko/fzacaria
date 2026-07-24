import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthStatus } from '@/lib/auth'

// GET - Retrieve ML settings (credentials masked)
export async function GET() {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const settings = await prisma.mLSettings.findFirst()

    if (!settings) {
      return NextResponse.json({
        configured: false,
        appId: '',
        appSecret: '',
        redirectUri: 'https://fzacaria.com.ar/api/mercadolibre/auth/callback',
      })
    }

    return NextResponse.json({
      configured: !!(settings.appId && settings.appSecret),
      appId: settings.appId,
      // Mask the secret for security - only show last 4 chars
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

// PUT - Save ML settings
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { appId, appSecret, redirectUri } = body

    if (!appId || !appSecret) {
      return NextResponse.json({ error: 'App ID y App Secret son requeridos' }, { status: 400 })
    }

    const existing = await prisma.mLSettings.findFirst()

    let settings
    if (existing) {
      settings = await prisma.mLSettings.update({
        where: { id: existing.id },
        data: {
          appId,
          appSecret,
          redirectUri: redirectUri || existing.redirectUri,
        },
      })
    } else {
      settings = await prisma.mLSettings.create({
        data: {
          appId,
          appSecret,
          redirectUri: redirectUri || 'https://fzacaria.com.ar/api/mercadolibre/auth/callback',
        },
      })
    }

    // Also delete any existing ML tokens since credentials changed
    await prisma.mercadoLibreToken.deleteMany()

    return NextResponse.json({
      success: true,
      configured: true,
      appId: settings.appId,
      appSecret: '*'.repeat(Math.max(0, settings.appSecret.length - 4)) + settings.appSecret.slice(-4),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Remove ML settings and disconnect
export async function DELETE() {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    await prisma.mercadoLibreToken.deleteMany()
    await prisma.mLSettings.deleteMany()

    return NextResponse.json({ success: true, message: 'Configuración de ML eliminada' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
