import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthStatus } from '@/lib/auth'
import { localPut } from '@/lib/upload-local'

interface BackupData {
  version: string
  createdAt: string
  type: string
  integrityOk: boolean
  integrityIssues: string[]
  data: {
    properties: any[]
    articles: any[]
    admins: any[]
    contactMessages: any[]
    tasacionRequests: any[]
    visits: any[]
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { filename } = body

    if (!filename) {
      return NextResponse.json({ error: 'Nombre de archivo requerido' }, { status: 400 })
    }

    // Find backup in database
    const backupRecord = await prisma.backup.findFirst({
      where: { filename }
    })

    if (!backupRecord) {
      return NextResponse.json({ error: 'Backup no encontrado' }, { status: 404 })
    }

    if (!backupRecord.blobUrl) {
      return NextResponse.json({ error: 'Archivo de backup no disponible' }, { status: 404 })
    }

    // Fetch backup data from Vercel Blob
    const blobResponse = await fetch(backupRecord.blobUrl)
    if (!blobResponse.ok) {
      return NextResponse.json({ error: 'Error al descargar archivo del almacenamiento' }, { status: 500 })
    }

    const fileContent = await blobResponse.text()
    let backupData: BackupData

    try {
      backupData = JSON.parse(fileContent)
    } catch {
      return NextResponse.json({ error: 'Archivo de backup corrupto o inválido' }, { status: 400 })
    }

    if (!backupData.version || !backupData.data) {
      return NextResponse.json({ error: 'Estructura de backup inválida' }, { status: 400 })
    }

    if (!backupData.data.properties || !Array.isArray(backupData.data.properties)) {
      return NextResponse.json({ error: 'Backup no contiene propiedades válidas' }, { status: 400 })
    }

    // Create a safety backup before restoring
    try {
      const currentProperties = await prisma.property.findMany({ include: { temporadas: true } })
      const currentArticles = await prisma.article.findMany()
      const currentAdmins = await prisma.admin.findMany()
      const currentMessages = await prisma.contactMessage.findMany()
      const currentTasaciones = await prisma.tasacionRequest.findMany()
      const currentVisits = await prisma.visit.findMany({ take: 5000 })

      const safetyData = {
        version: '1.0',
        createdAt: new Date().toISOString(),
        type: 'pre-restore-safety',
        integrityOk: true,
        integrityIssues: [],
        data: {
          properties: currentProperties,
          articles: currentArticles,
          admins: currentAdmins,
          contactMessages: currentMessages,
          tasacionRequests: currentTasaciones,
          visits: currentVisits
        }
      }

      const safetyTimestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
      const safetyFilename = `backup-pre-restore-${safetyTimestamp}.json`
      const safetyJson = JSON.stringify(safetyData, null, 2)

      const safetyBlob = await localPut(`backups/${safetyFilename}`, Buffer.from(safetyJson, 'utf-8'), {
        contentType: 'application/json',
      })

      await prisma.backup.create({
        data: {
          filename: safetyFilename,
          size: Buffer.byteLength(safetyJson, 'utf-8'),
          type: 'manual',
          status: 'completed',
          propertyCount: currentProperties.length,
          articleCount: currentArticles.length,
          integrityOk: true,
          notes: `Backup de seguridad creado antes de restaurar ${filename}`,
          blobUrl: safetyBlob.url,
        }
      })
    } catch (safetyError) {
      console.error('Pre-restore safety backup failed:', safetyError)
    }

    // Perform the restore
    const result = await prisma.$transaction(async (tx) => {
      let propertiesRestored = 0
      let articlesRestored = 0
      let errors: string[] = []

      if (backupData.data.properties && backupData.data.properties.length > 0) {
        await tx.temporada.deleteMany()
        await tx.property.deleteMany()

        for (const prop of backupData.data.properties) {
          try {
            const { temporadas, ...propData } = prop
            await tx.property.create({
              data: {
                ...propData,
                temporadas: temporadas ? {
                  create: temporadas.map((t: any) => ({
                    name: t.name || '',
                    startDate: new Date(t.startDate),
                    endDate: new Date(t.endDate),
                    price: t.price || '',
                    currency: t.currency || 'USD',
                    available: t.available !== false,
                    order: t.order || 0,
                  }))
                } : undefined
              }
            })
            propertiesRestored++
          } catch (err) {
            errors.push(`Error restaurando propiedad "${prop.title}": ${err instanceof Error ? err.message : 'Error desconocido'}`)
          }
        }
      }

      if (backupData.data.articles && backupData.data.articles.length > 0) {
        await tx.article.deleteMany()
        for (const art of backupData.data.articles) {
          try {
            await tx.article.create({ data: art })
            articlesRestored++
          } catch (err) {
            errors.push(`Error restaurando artículo "${art.title}": ${err instanceof Error ? err.message : 'Error desconocido'}`)
          }
        }
      }

      if (backupData.data.admins && backupData.data.admins.length > 0) {
        await tx.admin.deleteMany()
        for (const admin of backupData.data.admins) {
          try {
            await tx.admin.create({ data: admin })
          } catch (err) {
            errors.push(`Error restaurando admin "${admin.email}": ${err instanceof Error ? err.message : 'Error desconocido'}`)
          }
        }
      }

      if (backupData.data.contactMessages && backupData.data.contactMessages.length > 0) {
        await tx.contactMessage.deleteMany()
        for (const msg of backupData.data.contactMessages) {
          try { await tx.contactMessage.create({ data: msg }) } catch {}
        }
      }

      if (backupData.data.tasacionRequests && backupData.data.tasacionRequests.length > 0) {
        await tx.tasacionRequest.deleteMany()
        for (const tas of backupData.data.tasacionRequests) {
          try { await tx.tasacionRequest.create({ data: tas }) } catch {}
        }
      }

      if (backupData.data.visits && backupData.data.visits.length > 0) {
        await tx.visit.deleteMany()
        for (const visit of backupData.data.visits) {
          try { await tx.visit.create({ data: visit }) } catch {}
        }
      }

      return { propertiesRestored, articlesRestored, errors }
    })

    return NextResponse.json({
      message: 'Base de datos restaurada exitosamente',
      propertiesRestored: result.propertiesRestored,
      articlesRestored: result.articlesRestored,
      errors: result.errors.length > 0 ? result.errors : undefined,
      backupDate: backupData.createdAt,
      backupIntegrity: backupData.integrityOk
    })
  } catch (error) {
    console.error('Restore error:', error)
    return NextResponse.json({
      error: `Error al restaurar: ${error instanceof Error ? error.message : 'Error desconocido'}`
    }, { status: 500 })
  }
}
