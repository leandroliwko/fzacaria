import { NextRequest, NextResponse } from 'next/server'
import { localPut } from '@/lib/upload-local'
import { getAuthStatus } from '@/lib/auth'

// Client-side upload endpoint — receives resized images and videos.
// On Vercel hobby plan, the default body size limit is ~4.5MB.
// Images are resized client-side to <4MB, so they always fit.
// Videos need the upload-server endpoint with higher limits.

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const auth = await getAuthStatus()
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const contentType = formData.get('contentType') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No se encontró el archivo' }, { status: 400 })
    }

    // Add unique suffix to filename
    const originalName = file.name
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const lastDot = originalName.lastIndexOf('.')
    const uniqueName = lastDot > 0
      ? originalName.substring(0, lastDot) + '_' + randomSuffix + originalName.substring(lastDot)
      : originalName + '_' + randomSuffix

    const result = await localPut(uniqueName, file, {
      contentType: contentType || file.type || undefined,
    })

    return NextResponse.json({ url: result.url })
  } catch (error: any) {
    console.error('Upload error:', {
      message: error.message,
      name: error.name,
    })
    return NextResponse.json(
      { error: error.message || 'Error al subir el archivo' },
      { status: 500 }
    )
  }
}
