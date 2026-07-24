import { NextRequest, NextResponse } from 'next/server'
import { getAuthStatus } from '@/lib/auth'
import { getCabapropSettings, saveCabapropSettings, verifyCabapropApiKey } from '@/lib/cabaprop'

// GET - Get current Cabaprop settings
export async function GET() {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const settings = await getCabapropSettings()
    return NextResponse.json({
      configured: !!settings?.apiKey,
      apiKey: settings?.apiKey ? `${settings.apiKey.substring(0, 8)}...` : '', // Mask the key
      webhookUrl: settings?.webhookUrl || '',
      matricula: settings?.matricula || '',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Save Cabaprop settings
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { apiKey, webhookUrl, matricula } = await request.json()
    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json({ error: 'API Key es requerida' }, { status: 400 })
    }

    // Verify the API key before saving
    const verification = await verifyCabapropApiKey(apiKey.trim())
    if (!verification.valid) {
      return NextResponse.json({
        error: `La API Key no es válida: ${verification.info}`,
        info: verification.info,
      }, { status: 400 })
    }

    await saveCabapropSettings({
      apiKey: apiKey.trim(),
      webhookUrl: webhookUrl?.trim() || '',
      matricula: matricula?.trim() || '',
    })

    return NextResponse.json({
      success: true,
      info: verification.info,
      message: 'Configuración guardada correctamente',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Remove Cabaprop settings
export async function DELETE() {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { prisma } = require('@/lib/prisma')
    await prisma.cabapropSettings.deleteMany()

    return NextResponse.json({ success: true, message: 'Configuración eliminada' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
