import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthStatus } from '@/lib/auth'
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
      if (!prop.price || prop.price.trim() === '') {
        const hasTemporadaPrices = prop.operation === 'temporario' && prop.temporadas.length > 0
        if (!hasTemporadaPrices) {
          issues.push(`Propiedad "${prop.title}" (${prop.code}) no tiene precio`)
        }
      }
      if (prop.operation === 'temporario' && prop.temporadas.length === 0) {
        issues.push(`Propiedad temporaria "${prop.title}" (${prop.code}) no tiene temporadas definidas`)
      }
    }

    const articles = await prisma.article.findMany()
    for (const art of articles) {
      if (!art.title || art.title.trim() === '') {
        issues.push(`Artículo con ID ${art.id} no tiene título`)
      }
      if (!art.image || art.image.trim() === '') {
        issues.push(`Artículo "${art.title}" no tiene imagen`)
      }
    }

    const adminCount = await prisma.admin.count()
    if (adminCount === 0) {
      issues.push('No hay usuario administrador')
    }
  } catch (error) {
    issues.push(`Error de conexión a la base de datos: ${error instanceof Error ? error.message : 'Desconocido'}`)
  }

  return { ok: issues.length === 0, issues }
}

async function createBackup(type: 'auto' | 'manual'): Promise<{ success: boolean; filename?: string; error?: string; integrityOk: boolean; issues: string[] }> {
  try {
    const validation = await validateDatabaseIntegrity()

    if (type === 'auto' && validation.issues.some(i => i.includes('Error de conexión'))) {
      return {
        success: false,
        error: 'Base de datos no accesible, backup automático cancelado',
        integrityOk: false,
        issues: validation.issues
      }
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
      type,
      integrityOk: validation.ok,
      integrityIssues: validation.issues,
      data: {
        properties,
        articles,
        admins,
        contactMessages,
        tasacionRequests,
        visits
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
    const filename = `backup-${type}-${timestamp}.json`
    const blobPath = `backups/${filename}`

    // Upload to local filesystem
    const jsonStr = JSON.stringify(backupData, null, 2)
    const blob = await localPut(blobPath, Buffer.from(jsonStr, 'utf-8'), {
      contentType: 'application/json',
    })

    await prisma.backup.create({
      data: {
        filename,
        size: Buffer.byteLength(jsonStr, 'utf-8'),
        type,
        status: 'completed',
        propertyCount: properties.length,
        articleCount: articles.length,
        integrityOk: validation.ok,
        notes: validation.ok ? '' : validation.issues.join('; '),
        blobUrl: blob.url,
      }
    })

    await cleanupOldBackups()

    return {
      success: true,
      filename,
      integrityOk: validation.ok,
      issues: validation.issues
    }
  } catch (error) {
    console.error('Backup creation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      integrityOk: false,
      issues: []
    }
  }
}

async function cleanupOldBackups() {
  try {
    const autoBackups = await prisma.backup.findMany({
      where: { type: 'auto', status: 'completed' },
      orderBy: { createdAt: 'desc' }
    })

    const toDelete = autoBackups.slice(96)

    for (const backup of toDelete) {
      if (backup.blobUrl) {
        try { await localDel(backup.blobUrl) } catch {}
      }
      await prisma.backup.delete({ where: { id: backup.id } }).catch(() => {})
    }

    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const oldManualBackups = await prisma.backup.findMany({
      where: { type: 'manual', status: 'completed', createdAt: { lt: ninetyDaysAgo } }
    })

    for (const backup of oldManualBackups) {
      if (backup.blobUrl) {
        try { await localDel(backup.blobUrl) } catch {}
      }
      await prisma.backup.delete({ where: { id: backup.id } }).catch(() => {})
    }
  } catch (error) {
    console.error('Cleanup error:', error)
  }
}

// GET - List all backups
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const backups = await prisma.backup.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100
    })

    const backupsWithStatus = backups.map(backup => ({
      ...backup,
      fileExists: !!backup.blobUrl,
    }))

    return NextResponse.json({ backups: backupsWithStatus })
  } catch (error) {
    console.error('List backups error:', error)
    return NextResponse.json({ error: 'Error al listar backups' }, { status: 500 })
  }
}

// POST - Create manual backup
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const result = await createBackup('manual')

    if (result.success) {
      return NextResponse.json({
        message: 'Backup creado exitosamente',
        filename: result.filename,
        integrityOk: result.integrityOk,
        issues: result.issues
      })
    } else {
      return NextResponse.json({
        error: result.error || 'Error al crear backup',
        integrityOk: result.integrityOk,
        issues: result.issues
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Manual backup error:', error)
    return NextResponse.json({ error: 'Error al crear backup' }, { status: 500 })
  }
}
