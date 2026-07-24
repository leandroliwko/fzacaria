import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

/**
 * On Vercel: files are written to /tmp/uploads (ephemeral but writable).
 * On Railway / local: files are in public/uploads (persistent).
 * This route serves from BOTH locations, checking /tmp first.
 */

const TMP_UPLOAD_DIR = path.join('/tmp', 'uploads')
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

    // Try /tmp/uploads first (Vercel runtime uploads), then public/uploads (static)
    const candidates = [TMP_UPLOAD_DIR, STATIC_UPLOAD_DIR]
    let filePath: string | null = null
    let fileStat: any = null

    for (const dir of candidates) {
      const candidate = path.join(dir, safeName)
      // Ensure the resolved path is still within the directory
      if (!candidate.startsWith(dir)) continue
      if (existsSync(candidate)) {
        filePath = candidate
        fileStat = await stat(candidate)
        break
      }
    }

    if (!filePath || !fileStat) {
      return NextResponse.json({ error: 'Imagen no encontrada' }, { status: 404 })
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
