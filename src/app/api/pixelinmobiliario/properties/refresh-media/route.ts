import { NextRequest, NextResponse } from 'next/server'
import { getAuthStatus } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getMyProperties, type PixelProperty } from '@/lib/pixelinmobiliario'

export const dynamic = 'force-dynamic'

// ============================================================
// POST /api/pixelinmobiliario/properties/refresh-media
//
// Updates the `image`, `images` and `video` fields of properties
// that were previously imported from Pixel Inmobiliario but had
// no media (because the first version of the import code looked
// for an `images` array that the CRM API doesn't expose).
//
// The CRM only exposes ONE main image per property in the list
// endpoint (`main_image_thumb` / `original_main_image_thumb`)
// plus an optional `video_url`. We update the local Property
// with these.
// ============================================================

function pickFirst<T = any>(obj: any, keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj?.[k] !== undefined && obj?.[k] !== null && obj?.[k] !== '') {
      return obj[k] as T
    }
  }
  return undefined
}

function extractImages(p: PixelProperty): string[] {
  const urls: string[] = []

  const raw = pickFirst<any>(p, ['images', 'photos', 'gallery', 'fotos', 'imagenes'])
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === 'string') {
        urls.push(item)
      } else if (item && typeof item === 'object') {
        const u = pickFirst<string>(item, ['url', 'full_url', 'src', 'path', 'large', 'medium', 'original'])
        if (u) urls.push(u)
      }
    }
  } else if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === 'string') urls.push(item)
          else if (item?.url) urls.push(item.url)
        }
      }
    } catch {
      raw.split(',').forEach((s) => { if (s.trim()) urls.push(s.trim()) })
    }
  }

  if (urls.length === 0) {
    const main = pickFirst<string>(p, [
      'original_main_image_thumb',
      'main_image_thumb',
      'main_image',
      'mainImage',
      'cover',
      'thumbnail',
      'thumb',
    ])
    if (main) urls.push(main)
  }

  return urls.filter((u) => /^https?:\/\//.test(u))
}

function extractVideo(p: PixelProperty): string | null {
  const v = pickFirst<string>(p, ['video_url', 'generated_video_url', 'video', 'youtube_url'])
  if (!v) return null
  const s = String(v).trim()
  if (!s || !/^https?:\/\//.test(s)) return null
  return s
}

function buildCode(p: PixelProperty): string {
  const code = pickFirst<string>(p, ['code', 'ref_code', 'reference', 'codigo', 'cod'])
  return code ? String(code).slice(0, 20) : 'PIXEL-' + p.id
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated || !auth.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const requestedIds: number[] | undefined = Array.isArray(body?.propertyIds)
      ? body.propertyIds.map((n: any) => parseInt(n, 10)).filter((n: number) => !isNaN(n))
      : undefined

    // 1. Fetch all properties from Pixel (paginate)
    const allPixel: PixelProperty[] = []
    let page = 1
    const perPage = 100
    let safety = 50
    while (safety-- > 0) {
      const res = await getMyProperties(page, perPage)
      if (!res.data.length) break
      allPixel.push(...res.data)
      if (res.currentPage >= res.lastPage) break
      page++
      if (requestedIds && allPixel.filter((p) => requestedIds.includes(p.id)).length >= requestedIds.length) break
    }

    const toUpdate = requestedIds
      ? allPixel.filter((p) => requestedIds.includes(p.id))
      : allPixel

    if (!toUpdate.length) {
      return NextResponse.json({
        success: true,
        updated: 0,
        notFound: 0,
        message: 'No se encontraron propiedades en Pixel para actualizar',
      })
    }

    // 2. Build a map of code -> pixel property
    const pixelByCode = new Map<string, PixelProperty>()
    for (const p of toUpdate) {
      pixelByCode.set(buildCode(p), p)
    }

    // 3. Find local properties matching those codes
    const codes = Array.from(pixelByCode.keys())
    const locals = await prisma.property.findMany({
      where: { code: { in: codes } },
      select: { id: true, code: true, title: true, image: true, images: true, video: true },
    })

    const updated: any[] = []
    const notFound: any[] = []
    const errors: any[] = []

    for (const local of locals) {
      const p = pixelByCode.get(local.code!)
      if (!p) continue

      try {
        const images = extractImages(p)
        const cover = images[0] || local.image || ''
        const video = extractVideo(p)

        // Skip if nothing to update (already has image + video)
        const needsImageUpdate = !local.image && !!cover
        const needsImagesUpdate = !local.images && images.length > 0
        const needsVideoUpdate = !local.video && !!video

        if (!needsImageUpdate && !needsImagesUpdate && !needsVideoUpdate) {
          // Already has media, skip
          continue
        }

        const data: any = {}
        if (needsImageUpdate) data.image = cover
        if (needsImagesUpdate) data.images = images.join(',')
        if (needsVideoUpdate) data.video = video

        await prisma.property.update({
          where: { id: local.id },
          data,
        })

        updated.push({
          id: local.id,
          code: local.code,
          title: local.title,
          pixelId: p.id,
          imageSet: !!needsImageUpdate,
          imagesSet: !!needsImagesUpdate,
          videoSet: !!needsVideoUpdate,
        })
      } catch (err: any) {
        errors.push({ localId: local.id, code: local.code, error: err.message })
      }
    }

    // Report Pixel properties that have no matching local property
    const localCodes = new Set(locals.map((l) => l.code))
    for (const [code, p] of pixelByCode.entries()) {
      if (!localCodes.has(code)) {
        notFound.push({ pixelId: p.id, code, title: p.title })
      }
    }

    return NextResponse.json({
      success: true,
      pixelTotal: toUpdate.length,
      localMatched: locals.length,
      updated: updated.length,
      notFound: notFound.length,
      errors,
      updatedDetail: updated,
      notFoundDetail: notFound.slice(0, 20), // limit
    })
  } catch (error: any) {
    console.error('POST /api/pixelinmobiliario/properties/refresh-media error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
