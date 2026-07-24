import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

/**
 * Serve uploaded files from local filesystem (Railway / local dev).
 * On Vercel, files are stored in Vercel Blob and served directly from blob URLs,
 * so this route is only needed for non-Vercel environments.
 */

const STATIC_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

// MIME type map
const MIME_TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.avi': 'video/avi',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params

    // Sanitize filename: prevent directory traversal
    const safeName = filename.replace(/\.\./g, '').replace(/\//g, '').replace(/\\/g, '')
    if (!safeName) {
      return NextResponse.json({ error: 'Nombre de archivo inválido' }, { status: 400 })
    }

    const filePath = path.join(STATIC_UPLOAD_DIR, safeName)

    // Ensure the resolved path is still within STATIC_UPLOAD_DIR
    if (!filePath.startsWith(STATIC_UPLOAD_DIR)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Check file exists
    let fileStat
    try {
      fileStat = await stat(filePath)
    } catch {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
    }

    // Read file
    const buffer = await readFile(filePath)

    // Determine content type
    const ext = path.extname(safeName).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Last-Modified': fileStat.mtime.toUTCString(),
      },
    })
  } catch (error) {
    console.error('Error serving file:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
