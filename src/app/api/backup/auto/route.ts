import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { localPut, localDel } from '@/lib/upload-local'

async function validateDatabaseIntegrity(): Promise<{ ok: boolean; issues: string[] }> {
  const issues: string[] = []

  try {
    const properties = await prisma.property.findMany({
      include: { temporadas: true }
    })

    if (properties.length === 0) {
      issues.push('No hay propiedades en la base de datos')
    }

    for (const prop of properties) {
      if (!prop.image || prop.image.trim() === '') {
        issues.push(`Propiedad "${prop.title}" (${prop.code}) no tiene imagen principal`)
      }
      if (prop.image && prop.image.length < 20 && !prop.image.startsWith('http')) {
        issues.push(`Propiedad "${prop.title}" (${prop.code}) tiene imagen inválida`)
      }
      if (!prop.title || prop.title.trim() === '') {
        issues.push(`Propiedad con ID ${prop.id} no tiene título`)
      }
    }

    const adminCount = await prisma.admin.count()
    if (adminCount === 0) {
      issues.push('No hay usuario administrador')
    }
  } catch (error) {
    issues.push(`Error de conexión: ${error instanceof Error ? error.message : 'Desconocido'}`)
  }

  return { ok: issues.length === 0, issues }
}

// Vercel Cron endpoint (daily) + visit-triggered auto-backup
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  }

  try {
    const validation = await validateDatabaseIntegrity()

    if (validation.issues.some(i => i.includes('Error de conexión'))) {
      await prisma.backup.create({
        data: {
          filename: `failed-auto-${Date.now()}.json`,
          size: 0,
          type: 'auto',
          status: 'failed',
          integrityOk: false,
          notes: validation.issues.join('; ')
        }
      }).catch(() => {})

      return NextResponse.json({ success: false, message: 'Base de datos no accesible', issues: validation.issues })
    }

    const properties = await prisma.property.findMany({
      include: { temporadas: true },
      orderBy: { createdAt: 'desc' }
    })

    const articles = await prisma.article.findMany({ orderBy: { createdAt: 'desc' } })
    const admins = await prisma.admin.findMany()
    const contactMessages = await prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } })
    const tasacionRequests = await prisma.tasacionRequest.findMany({ orderBy: { createdAt: 'desc' } })
    const visits = await prisma.visit.findMany({ orderBy: { createdAt: 'desc' }, take: 5000 })

    const backupData = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      type: 'auto',
      integrityOk: validation.ok,
      integrityIssues: validation.issues,
      data: { properties, articles, admins, contactMessages, tasacionRequests, visits }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
    const filename = `backup-auto-${timestamp}.json`

    const jsonStr = JSON.stringify(backupData, null, 2)
    const blob = await localPut(`backups/${filename}`, Buffer.from(jsonStr, 'utf-8'), {
      contentType: 'application/json',
    })

    await prisma.backup.create({
      data: {
        filename,
        size: Buffer.byteLength(jsonStr, 'utf-8'),
        type: 'auto',
        status: 'completed',
        propertyCount: properties.length,
        articleCount: articles.length,
        integrityOk: validation.ok,
        notes: validation.ok ? '' : validation.issues.join('; '),
        blobUrl: blob.url,
      }
    })

    // Cleanup old auto-backups (keep 96 = 24h worth)
    const autoBackups = await prisma.backup.findMany({
      where: { type: 'auto', status: 'completed' },
      orderBy: { createdAt: 'desc' }
    })

    const toDelete = autoBackups.slice(96)
    for (const b of toDelete) {
      if (b.blobUrl) { try { await localDel(b.blobUrl) } catch {} }
      await prisma.backup.delete({ where: { id: b.id } }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      message: 'Backup automático creado',
      filename,
      integrityOk: validation.ok,
      propertyCount: properties.length,
      articleCount: articles.length
    })
  } catch (error) {
    console.error('Auto-backup error:', error)
    await prisma.backup.create({
      data: {
        filename: `failed-auto-${Date.now()}.json`,
        size: 0,
        type: 'auto',
        status: 'failed',
        integrityOk: false,
        notes: error instanceof Error ? error.message : 'Error desconocido'
      }
    }).catch(() => {})

    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error desconocido' }, { status: 500 })
  }
}
