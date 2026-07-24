import { NextRequest, NextResponse } from 'next/server'
import { getAuthStatus } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getMyProperties, type PixelProperty } from '@/lib/pixelinmobiliario'

export const dynamic = 'force-dynamic'

// ============================================================
// POST /api/pixelinmobiliario/properties/import
//
// Body: { propertyIds?: number[] }   // if omitted, imports all visible
//
// Fetches properties from Pixel Inmobiliario CRM and creates them
// in the local Prisma `Property` table.  Mapping is defensive —
// Pixel's response shape is not documented, so we try multiple
// possible field names for each local field.
// ============================================================

// ---------- helpers ----------

function pickFirst<T = any>(obj: any, keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj?.[k] !== undefined && obj?.[k] !== null && obj?.[k] !== '') {
      return obj[k] as T
    }
  }
  return undefined
}

function toInt(v: any, fallback: number | undefined = 0): number | undefined {
  if (v === null || v === undefined || v === '') return fallback
  const n = parseInt(String(v).replace(/[^0-9-]/g, ''), 10)
  return isNaN(n) ? fallback : n
}

function toFloat(v: any, fallback = 0): number {
  if (v === null || v === undefined || v === '') return fallback
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? fallback : n
}

function normalizeType(v: any): string {
  const s = String(v || '').toLowerCase().trim()
  // map common Pixel types to our Property.type enum
  const map: Record<string, string> = {
    casa: 'casa',
    departamento: 'departamento',
    dpto: 'departamento',
    depto: 'departamento',
    chalet: 'chalet',
    ph: 'ph',
    lote: 'lote',
    local: 'local',
    campo: 'campo',
    oficina: 'oficina',
    quinta: 'quinta',
    hotel: 'hotel',
    cochera: 'local',
    galpon: 'galpon',
    negocio: 'local',
    terreno: 'lote',
  }
  return map[s] || (s ? s : 'casa')
}

function normalizeOperation(v: any): string {
  const s = String(v || '').toLowerCase().trim()
  if (s.includes('alquil') && (s.includes('temp') || s.includes('vacac'))) return 'temporario'
  if (s.includes('alquil')) return 'alquiler'
  if (s.includes('vent')) return 'venta'
  if (s.includes('venta')) return 'venta'
  // fallback to 'venta' which is the most common
  return 'venta'
}

function formatPrice(v: any, currency: any): string {
  if (v === null || v === undefined || v === '') return 'Consultar'
  const n = toFloat(v, 0)
  const cur = (String(currency || '').toUpperCase() === 'ARS' || String(currency || '').toUpperCase() === '$')
    ? 'ARS'
    : 'USD'
  if (n === 0) return 'Consultar'
  return `${cur} ${n.toLocaleString('es-AR')}`
}

function buildLocation(p: PixelProperty): string {
  const parts = [
    pickFirst<string>(p, ['address', 'street', 'direccion', 'calle']),
    pickFirst<string>(p, ['neighborhood', 'barrio', 'zone', 'zona']),
    pickFirst<string>(p, ['city', 'ciudad', 'localidad']),
    pickFirst<string>(p, ['state', 'provincia', 'estado']),
  ].filter(Boolean)
  return parts.join(', ') || 'Sin ubicación'
}

function buildTitle(p: PixelProperty): string {
  if (p.title && String(p.title).trim()) return String(p.title).trim()
  const type = normalizeType(pickFirst(p, ['property_type', 'type', 'ad_type', 'tipo_inmueble']))
  const op = normalizeOperation(pickFirst(p, ['operation_type', 'operation', 'operacion', 'ad_operation']))
  const loc = pickFirst<string>(p, ['city', 'ciudad', 'localidad']) || ''
  const opLabel = op === 'venta' ? 'en venta' : op === 'alquiler' ? 'en alquiler' : 'en alquiler temporario'
  return `${type} ${opLabel}${loc ? ' en ' + loc : ''}`.trim()
}

function extractImages(p: PixelProperty): string[] {
  const urls: string[] = []

  // 1. Try array fields first (in case some future API version returns an array)
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

  // 2. Pixel CRM only exposes ONE main image per property in the list endpoint.
  //    Fields (in priority order): original_main_image_thumb, main_image_thumb,
  //    main_image, mainImage, cover, thumbnail, thumb
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

  // Filter to absolute URLs only (Pixel serves them as absolute https URLs)
  return urls.filter((u) => /^https?:\/\//.test(u))
}

function extractVideo(p: PixelProperty): string | null {
  const v = pickFirst<string>(p, ['video_url', 'generated_video_url', 'video', 'youtube_url'])
  if (!v) return null
  const s = String(v).trim()
  if (!s || !/^https?:\/\//.test(s)) return null
  return s
}

function buildDescription(p: PixelProperty): string {
  const desc = pickFirst<string>(p, ['description', 'descripcion', 'details', 'detalle']) || ''
  const extras: string[] = []
  if (p.age) extras.push(`Antigüedad: ${p.age} años`)
  if (p.expenses) extras.push(`Expensas: ${p.expenses}`)
  if (p.parking) extras.push(`Cocheras: ${p.parking}`)
  if (extras.length && desc) return `${desc}\n\n${extras.join(' · ')}`
  if (extras.length) return extras.join(' · ')
  return desc || ''
}

function buildExtras(p: PixelProperty): string {
  const extras: string[] = []
  // common amenity fields
  const amenityKeys = ['pool', 'piscina', 'garden', 'jardin', 'garage', 'cochera', 'balcony', 'balcon',
    'terrace', 'terraza', 'elevator', 'ascensor', 'security', 'seguridad', 'amenities', 'extras']
  for (const k of amenityKeys) {
    if (p[k] && p[k] !== '0' && p[k] !== 0 && p[k] !== false) {
      extras.push(k)
    }
  }
  // Also handle 'features' or 'amenities' that may be arrays
  for (const arrKey of ['amenities_list', 'features_list', 'characteristics']) {
    const v = p[arrKey]
    if (Array.isArray(v)) v.forEach((x) => { if (typeof x === 'string') extras.push(x) })
  }
  return Array.from(new Set(extras)).join(',')
}

function buildCode(p: PixelProperty): string {
  const code = pickFirst<string>(p, ['code', 'ref_code', 'reference', 'codigo', 'cod'])
  return code ? String(code).slice(0, 20) : 'PIXEL-' + p.id
}

// ---------- main handler ----------

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

    // Resolve current admin user (to assign createdById)
    const currentUser = await prisma.admin.findUnique({ where: { email: auth.email } })
    if (!currentUser || currentUser.active === false) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Fetch all properties from Pixel (paginate until we have everything)
    const wanted: PixelProperty[] = []
    let page = 1
    const perPage = 100
    let safety = 50
    while (safety-- > 0) {
      const res = await getMyProperties(page, perPage)
      if (!res.data.length) break
      wanted.push(...res.data)
      if (res.currentPage >= res.lastPage) break
      page++
      // If we're filtering by ids and have collected all of them, stop early
      if (requestedIds && wanted.filter((p) => requestedIds.includes(p.id)).length >= requestedIds.length) break
    }

    const toImport = requestedIds
      ? wanted.filter((p) => requestedIds.includes(p.id))
      : wanted

    if (!toImport.length) {
      return NextResponse.json({
        success: true,
        imported: 0,
        skipped: 0,
        errors: [],
        message: 'No se encontraron propiedades para importar',
      })
    }

    // Find existing properties by code (so re-imports don't duplicate)
    const codes = toImport.map((p) => buildCode(p))
    const existing = await prisma.property.findMany({
      where: { code: { in: codes } },
      select: { id: true, code: true },
    })
    const existingCodes = new Set(existing.map((p) => p.code))

    // Helper: generate a unique code with suffix if collision
    function uniqueCode(base: string): string {
      if (!existingCodes.has(base)) {
        existingCodes.add(base)
        return base
      }
      let i = 2
      while (existingCodes.has(`${base}-${i}`)) i++
      const final = `${base}-${i}`
      existingCodes.add(final)
      return final
    }

    const created: any[] = []
    const skipped: any[] = []
    const errors: any[] = []

    for (const p of toImport) {
      try {
        const code = buildCode(p)
        if (existingCodes.has(code)) {
          skipped.push({ id: p.id, code, reason: 'ya existe localmente' })
          continue
        }

        const images = extractImages(p)
        const cover = images[0] || ''
        const video = extractVideo(p)
        const type = normalizeType(pickFirst(p, ['property_type', 'type', 'ad_type', 'tipo_inmueble']))
        const operation = normalizeOperation(
          pickFirst(p, ['operation_type', 'operation', 'operacion', 'ad_operation'])
        )
        const price = formatPrice(
          pickFirst(p, ['price', 'precio', 'value']),
          pickFirst(p, ['currency', 'moneda'])
        )
        const location = buildLocation(p)
        const title = buildTitle(p)
        const description = buildDescription(p)
        const extras = buildExtras(p)
        const bedrooms = toInt(pickFirst(p, ['bedrooms', 'dormitorios', 'habitaciones', 'rooms']), 0)
        const bathrooms = toInt(pickFirst(p, ['bathrooms', 'banos', 'banios']), 0)
        const area = toInt(pickFirst(p, ['total_area', 'surface_total', 'area_total', 'area']), 0)
        const coveredArea = toInt(pickFirst(p, ['covered_area', 'surface_covered', 'area_cubierta']), undefined)
        const totalArea = toInt(pickFirst(p, ['total_area', 'surface_total', 'area_total']), undefined)
        const lat = toFloat(pickFirst(p, ['lat', 'latitude', 'latitud']), -37.1067)
        const lng = toFloat(pickFirst(p, ['lng', 'longitude', 'longitud']), -56.8688)

        const newProp = await prisma.property.create({
          data: {
            code: uniqueCode(code),
            title,
            type,
            operation,
            price,
            location,
            bedrooms,
            bathrooms,
            area,
            image: cover,
            images: images.join(','),
            description,
            extras,
            features: '',
            active: true,
            featured: false,
            coveredArea,
            totalArea,
            latitude: lat,
            longitude: lng,
            video,
            createdById: currentUser.id,
          },
        })
        created.push({ id: newProp.id, code: newProp.code, title: newProp.title, pixelId: p.id })
        existingCodes.add(newProp.code)
      } catch (err: any) {
        errors.push({ pixelId: p.id, error: err.message })
      }
    }

    return NextResponse.json({
      success: true,
      imported: created.length,
      skipped: skipped.length,
      errors,
      created,
      skippedDetail: skipped,
    })
  } catch (error: any) {
    console.error('POST /api/pixelinmobiliario/properties/import error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
