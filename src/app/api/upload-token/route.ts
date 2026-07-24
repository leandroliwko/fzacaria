import { NextRequest, NextResponse } from 'next/server'
import { generateBlobUploadUrl } from '@vercel/blob'
import { getAuthStatus } from '@/lib/auth'

// Generates a client upload URL for Vercel Blob direct uploads.
// The browser uploads directly to Vercel Blob, bypassing the serverless function body size limit.
// This allows videos and large files to be uploaded without the 413 error.

export async function POST(request: NextRequest) {
  const auth = await getAuthStatus()
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { filename, contentType } = await request.json()

    if (!filename) {
      return NextResponse.json({ error: 'Filename requerido' }, { status: 400 })
    }

    // Add unique suffix to avoid collisions
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const lastDot = filename.lastIndexOf('.')
    const uniqueName = lastDot > 0
      ? filename.substring(0, lastDot) + '_' + randomSuffix + filename.substring(lastDot)
      : filename + '_' + randomSuffix

    const blob = await generateBlobUploadUrl({
      filename: uniqueName,
      contentType: contentType || undefined,
    })

    return NextResponse.json({
      uploadUrl: blob.uploadUrl,
      blobUrl: blob.blob.url,
      filename: uniqueName,
    })
  } catch (error: any) {
    console.error('Upload token error:', error.message)
    return NextResponse.json(
      { error: error.message || 'Error generando upload URL' },
      { status: 500 }
    )
  }
}
