import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthStatus } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('file')

    if (!filename) {
      return NextResponse.json({ error: 'Nombre de archivo requerido' }, { status: 400 })
    }

    // Find the backup record in the database
    const backup = await prisma.backup.findFirst({
      where: { filename }
    })

    if (!backup) {
      return NextResponse.json({ error: 'Backup no encontrado en la base de datos' }, { status: 404 })
    }

    if (!backup.blobUrl) {
      return NextResponse.json({ error: 'Archivo de backup no disponible (sin URL de almacenamiento)' }, { status: 404 })
    }

    // Fetch the backup data from Vercel Blob
    const blobResponse = await fetch(backup.blobUrl)

    if (!blobResponse.ok) {
      console.error(`Blob fetch failed: ${blobResponse.status} ${blobResponse.statusText}`)
      return NextResponse.json({ error: 'Error al descargar archivo del almacenamiento' }, { status: 500 })
    }

    const backupData = await blobResponse.text()

    // Return as downloadable JSON file
    return new NextResponse(backupData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': Buffer.byteLength(backupData, 'utf-8').toString(),
      },
    })
  } catch (error) {
    console.error('Download backup error:', error)
    return NextResponse.json({
      error: `Error al descargar: ${error instanceof Error ? error.message : 'Error desconocido'}`
    }, { status: 500 })
  }
}
