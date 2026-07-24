import { NextRequest, NextResponse } from 'next/server'
import { localPut } from '@/lib/upload-local'
import { getAuthStatus } from '@/lib/auth'

// Server-side upload fallback — Vercel Pro supports up to 50MB body size.
// Handles larger files that may fail on the primary /api/upload route.

export const maxDuration = 120

export async function POST(request: NextRequest) {
  const auth = await getAuthStatus()
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No se encontró el archivo' }, { status: 400 })
    }

    // Vercel Pro body size limit is 50MB
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: `El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo 50MB en Vercel Pro.` },
        { status: 413 }
      )
    }

    // Add unique suffix to filename
    const originalName = file.name
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const lastDot = originalName.lastIndexOf('.')
    const uniqueName = lastDot > 0
      ? originalName.substring(0, lastDot) + '_' + randomSuffix + originalName.substring(lastDot)
      : originalName + '_' + randomSuffix

    const result = await localPut(uniqueName, file, {
      contentType: file.type || undefined,
    })

    return NextResponse.json({ url: result.url })
  } catch (error: any) {
    console.error('Server upload error:', {
      message: error.message,
      name: error.name,
    })
    return NextResponse.json(
      { error: error.message || 'Error al subir el archivo' },
      { status: 500 }
    )
  }
}
