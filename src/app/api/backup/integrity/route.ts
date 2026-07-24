import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthStatus } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const issues: { severity: 'critical' | 'warning' | 'info'; message: string; propertyId?: string; propertyTitle?: string }[] = []

    try {
      await prisma.$queryRaw`SELECT 1`
      issues.push({ severity: 'info', message: 'Conexión a la base de datos: OK' })
    } catch (error) {
      issues.push({ severity: 'critical', message: `Error de conexión: ${error instanceof Error ? error.message : 'Desconocido'}` })
      return NextResponse.json({ ok: false, issues })
    }

    const properties = await prisma.property.findMany({
      include: { temporadas: true }
    })

    issues.push({ severity: 'info', message: `Total de propiedades: ${properties.length}` })

    if (properties.length === 0) {
      issues.push({ severity: 'critical', message: 'No hay propiedades en la base de datos' })
    }

    for (const prop of properties) {
      if (!prop.image || prop.image.trim() === '') {
        issues.push({ severity: 'warning', message: `Sin imagen principal`, propertyId: prop.id, propertyTitle: prop.title })
      } else if (prop.image.length < 20 && !prop.image.startsWith('http')) {
        issues.push({ severity: 'warning', message: `Imagen posiblemente inválida`, propertyId: prop.id, propertyTitle: prop.title })
      }

      if (!prop.title || prop.title.trim() === '') {
        issues.push({ severity: 'critical', message: `Propiedad sin título`, propertyId: prop.id })
      }

      if ((!prop.price || prop.price.trim() === '')) {
        // Propiedades temporarias pueden no tener precio general si tienen temporadas con precio
        const hasTemporadaPrices = prop.operation === 'temporario' && prop.temporadas.length > 0
        if (!hasTemporadaPrices) {
          issues.push({ severity: 'warning', message: `Sin precio`, propertyId: prop.id, propertyTitle: prop.title })
        }
      }

      if (prop.operation === 'temporario' && prop.temporadas.length === 0) {
        issues.push({ severity: 'warning', message: `Propiedad temporaria sin temporadas definidas`, propertyId: prop.id, propertyTitle: prop.title })
      }

      if (prop.images && prop.images.trim() !== '') {
        const imagesStr = prop.images.trim()
        // Aceptar tanto JSON array como URLs separadas por coma
        if (imagesStr.startsWith('[')) {
          try {
            const imagesArr = JSON.parse(imagesStr)
            if (!Array.isArray(imagesArr)) {
              issues.push({ severity: 'warning', message: `Imágenes adicionales con formato inválido`, propertyId: prop.id, propertyTitle: prop.title })
            }
          } catch {
            issues.push({ severity: 'warning', message: `Imágenes adicionales no JSON válido`, propertyId: prop.id, propertyTitle: prop.title })
          }
        }
        // Si no empieza con [, asumimos formato separado por comas (también válido)
      }
    }

    const articles = await prisma.article.findMany()
    issues.push({ severity: 'info', message: `Total de artículos: ${articles.length}` })

    const adminCount = await prisma.admin.count()
    if (adminCount === 0) {
      issues.push({ severity: 'critical', message: 'No hay usuario administrador' })
    }

    const lastBackup = await prisma.backup.findFirst({
      where: { status: 'completed' },
      orderBy: { createdAt: 'desc' }
    })

    if (lastBackup) {
      const hoursSinceBackup = (Date.now() - new Date(lastBackup.createdAt).getTime()) / (1000 * 60 * 60)
      if (hoursSinceBackup > 1) {
        issues.push({ severity: 'warning', message: `Último backup hace ${Math.round(hoursSinceBackup)} horas` })
      } else {
        issues.push({ severity: 'info', message: `Último backup hace ${Math.round(hoursSinceBackup * 60)} minutos` })
      }
    } else {
      issues.push({ severity: 'warning', message: 'No hay backups registrados' })
    }

    const criticalCount = issues.filter(i => i.severity === 'critical').length
    const warningCount = issues.filter(i => i.severity === 'warning').length

    return NextResponse.json({
      ok: criticalCount === 0,
      criticalCount,
      warningCount,
      totalChecks: issues.length,
      issues
    })
  } catch (error) {
    console.error('Integrity check error:', error)
    return NextResponse.json({
      ok: false,
      issues: [{ severity: 'critical', message: `Error: ${error instanceof Error ? error.message : 'Desconocido'}` }]
    }, { status: 500 })
  }
}
