import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

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

    const filePath = path.join(UPLOAD_DIR, safeName)

    // Ensure the resolved path is still within UPLOAD_DIR
    if (!filePath.startsWith(UPLOAD_DIR)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Check file exists
    let fileStat
    try {
      fileStat = await stat(filePath)
    } catch {
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
    console.error('Error serving image:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
