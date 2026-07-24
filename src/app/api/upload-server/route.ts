import { NextRequest, NextResponse } from 'next/server'
import { localPut } from '@/lib/upload-local'
import { getAuthStatus } from '@/lib/auth'

// Server-side upload — saves file to public/uploads/ on the server filesystem.
// No Vercel Blob dependency. Works on Railway or any Node.js hosting.
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

    // Check file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'El archivo es demasiado grande (máx. 100MB).' },
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
