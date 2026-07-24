import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readFileSync } from 'fs'
import { join } from 'path'

// Use ISR — cache the image for 1 hour on CDN, then revalidate in background
// This is better than force-dynamic because the CDN serves cached images instantly
// after the first request, avoiding cold starts for Facebook/Twitter crawlers
export const revalidate = 3600

const typeLabels: Record<string, string> = {
  casa: 'Casa', departamento: 'Depto', chalet: 'Chalet',
  ph: 'PH', lote: 'Lote', local: 'Local',
  campo: 'Campo', oficina: 'Oficina', quinta: 'Quinta', hotel: 'Hotel',
}
const operationLabels: Record<string, string> = {
  venta: 'Venta', alquiler: 'Alquiler', temporario: 'Temporario',
}

// Load font once and cache
let fontsCache: { name: string; data: ArrayBuffer; weight: number; style: string }[] | null = null

function getFonts() {
  if (fontsCache) return fontsCache
  try {
    const fontDir = join(process.cwd(), 'src/app/api/property/og/fonts')
    const regular = readFileSync(join(fontDir, 'Carlito-Regular.ttf'))
    const bold = readFileSync(join(fontDir, 'Carlito-Bold.ttf'))
    fontsCache = [
      { name: 'Carlito', data: regular.buffer as ArrayBuffer, weight: 400, style: 'normal' },
      { name: 'Carlito', data: bold.buffer as ArrayBuffer, weight: 700, style: 'normal' },
    ]
    return fontsCache
  } catch (e) {
    console.warn('OG fonts not found, using system fallback:', e)
    return undefined
  }
}

/**
 * Fetch an image URL and convert to base64 data URI for embedding in OG image.
 * Skips data: URIs (which can't be re-fetched) and handles errors gracefully.
 */
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    if (!url) return null
    // data: URIs are already base64 but can be enormous; skip them
    if (url.startsWith('data:')) return null
    const res = await fetch(url, {
      headers: { 'User-Agent': 'InmobiliariaFZ/1.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    // Don't try to fetch huge images (>5MB)
    const contentLength = res.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) return null
    const buf = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    return `data:${contentType};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

/**
 * Try to get a fetchable image URL from the property data.
 * Handles Vercel Blob URLs, relative paths, and data: URIs.
 */
function resolvePropertyImageUrl(image: string | null, images: string | null): string {
  // Try main image
  if (image && !image.startsWith('data:')) {
    if (image.startsWith('http')) return image
    return `https://fzacaria.com.ar/uploads/${image}`
  }
  // Try images array
  if (images) {
    const list = String(images).split(',').map(s => s.trim()).filter(Boolean)
    for (const img of list) {
      if (img.startsWith('data:')) continue
      if (img.startsWith('http')) return img
      return `https://fzacaria.com.ar/uploads/${img}`
    }
  }
  return ''
}

const monthNamesFull: Record<number, string> = {
  1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio',
  7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre',
}

function formatDateRange(start: Date, end: Date): string {
  const d1 = start.getDate()
  const m1 = monthNamesFull[start.getMonth() + 1] || ''
  const d2 = end.getDate()
  const m2 = monthNamesFull[end.getMonth() + 1] || ''
  if (start.getMonth() === end.getMonth()) {
    return `${d1} al ${d2} de ${m1}`
  }
  return `${d1} de ${m1} al ${d2} de ${m2}`
}

function formatPrice(price: string | number, currency: string): string {
  const numPrice = typeof price === 'string' ? price.trim() : String(price)
  if (!numPrice) return ''
  return currency === 'ARS' ? `$ ${numPrice}` : `U$S ${numPrice}`
}

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return new Response('Missing id', { status: 400 })
    }

    const property = await prisma.property.findUnique({
      where: { id },
      include: { temporadas: { orderBy: [{ order: 'asc' }, { startDate: 'asc' }] } },
    })

    if (!property || !property.active) {
      return new Response('Not found', { status: 404 })
    }

    // Resolve property image URL (handles data: URIs, relative paths, images array)
    const imageUrl = resolvePropertyImageUrl(property.image, property.images)
    const imageBase64 = await fetchImageAsBase64(imageUrl)

    // Build labels
    const opLabel = operationLabels[property.operation] || property.operation
    const tpLabel = typeLabels[property.type] || property.type
    const isTemporario = property.operation === 'temporario'

    // Details line
    const details: string[] = []
    if (property.bedrooms > 0) details.push(`${property.bedrooms} Dorm.`)
    if (property.bathrooms > 0) details.push(`${property.bathrooms} Baños`)
    if (property.area > 0) details.push(`${property.area.toLocaleString()} m²`)
    const detailsLine = details.join('  ·  ')

    // Title (truncate if too long)
    const title = property.title.length > 35 ? property.title.substring(0, 32) + '...' : property.title

    // Amenities (first 4 only for readability)
    const extras = property.extras
      ? String(property.extras).split(',').map((e: string) => e.trim()).filter(Boolean).slice(0, 4)
      : []

    // Temporadas data
    const temporadas = (property.temporadas || []).map((t: any) => ({
      name: t.name || 'Temporada',
      startDate: t.startDate ? new Date(t.startDate) : null,
      endDate: t.endDate ? new Date(t.endDate) : null,
      price: t.price || '',
      currency: t.currency || 'USD',
      available: t.available !== false,
    }))

    // Load fonts (lazy, cached)
    const fonts = getFonts()

    // For temporal properties, use a dedicated layout
    if (isTemporario) {
      return new ImageResponse(
        renderTemporarioOG({ imageBase64, opLabel, tpLabel, title, property, detailsLine, extras, temporadas, fonts }),
        { width: 1200, height: 630, fonts: fonts || undefined }
      )
    }

    // Standard property OG image (venta / alquiler)
    let priceText = ''
    if (property.price && String(property.price).trim()) {
      priceText = String(property.price)
    }

    return new ImageResponse(
      renderStandardOG({ imageBase64, opLabel, tpLabel, title, property, detailsLine, priceText, extras, fonts }),
      { width: 1200, height: 630, fonts: fonts || undefined }
    )
  } catch (error: any) {
    console.error('OG image error:', error?.message || error)
    // Return a simple fallback image so Facebook always gets a valid response
    try {
      return new ImageResponse(
        <div style={{
          width: 1200,
          height: 630,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a1628',
          color: '#c6a962',
          fontSize: 36,
          fontFamily: 'sans-serif',
        }}>
          Inmobiliaria Florencia Zacaria
        </div>,
        { width: 1200, height: 630 }
      )
    } catch {
      return new Response('Error generating OG image', { status: 500 })
    }
  }
}

// ─── TEMPORARIO OG IMAGE ───────────────────────────────────────
function renderTemporarioOG({ imageBase64, opLabel, tpLabel, title, property, detailsLine, extras, temporadas, fonts }: any) {
  // Show up to 3 seasons max for readability
  const visibleTemporadas = temporadas.slice(0, 3)

  return (
    <div style={{
      width: 1200,
      height: 630,
      display: 'flex',
      flexDirection: 'row',
      backgroundColor: '#0a1628',
      fontFamily: fonts ? 'Carlito' : 'sans-serif',
      overflow: 'hidden',
    }}>
      {/* Left side - Property Image (60%) */}
      <div style={{
        width: 720,
        height: 630,
        display: 'flex',
        flexShrink: 0,
        position: 'relative',
      }}>
        {imageBase64 ? (
          <img
            src={imageBase64}
            width={720}
            height={630}
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: 720,
            height: 630,
            backgroundColor: '#1a2a40',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#4a5568',
            fontSize: 28,
          }}>
            Sin imagen
          </div>
        )}
        {/* Dark overlay bar at bottom for text readability */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: 720,
          height: 200,
          backgroundColor: 'rgba(0,0,0,0.7)',
        }} />
        {/* Info overlay on image bottom */}
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: 24,
          right: 24,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Badges */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div style={{
              backgroundColor: '#c6a962',
              color: '#ffffff',
              padding: '6px 16px',
              borderRadius: 6,
              fontSize: 16,
              fontWeight: 700,
            }}>
              {opLabel.toUpperCase()}
            </div>
            <div style={{
              backgroundColor: '#4a5568',
              color: '#ffffff',
              padding: '6px 16px',
              borderRadius: 6,
              fontSize: 16,
              fontWeight: 700,
            }}>
              {tpLabel}
            </div>
          </div>
          {/* Title */}
          <div style={{
            color: '#ffffff',
            fontSize: 30,
            fontWeight: 700,
            lineHeight: 1.2,
          }}>
            {title}
          </div>
          {/* Location */}
          <div style={{
            color: '#c6a962',
            fontSize: 18,
            marginTop: 4,
          }}>
            {property.location}
          </div>
          {/* Details */}
          {detailsLine && (
            <div style={{
              color: '#e0e0ea',
              fontSize: 17,
              marginTop: 6,
            }}>
              {detailsLine}
            </div>
          )}
        </div>
      </div>

      {/* Right panel - Seasons + Brand */}
      <div style={{
        width: 480,
        height: 630,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0d1b2e',
        paddingLeft: 28,
        paddingRight: 28,
        paddingTop: 28,
        paddingBottom: 20,
        justifyContent: 'space-between',
      }}>
        {/* Seasons section */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* Header */}
          <div style={{
            color: '#c6a962',
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 16,
            letterSpacing: 1.5,
          }}>
            TEMPORADAS
          </div>

          {/* Season cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visibleTemporadas.map((temp: any, idx: number) => {
              const dateStr = temp.startDate && temp.endDate
                ? formatDateRange(temp.startDate, temp.endDate)
                : ''
              return (
                <div key={idx} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: temp.available ? '#132240' : '#0d1520',
                  borderRadius: 10,
                  padding: '14px 16px',
                  borderLeft: `4px solid ${temp.available ? '#c6a962' : '#555'}`,
                  opacity: temp.available ? 1 : 0.5,
                }}>
                  {/* Season name + availability */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{
                      color: '#ffffff',
                      fontSize: 17,
                      fontWeight: 700,
                    }}>
                      {temp.name}
                    </span>
                    <span style={{
                      color: temp.available ? '#4ade80' : '#f87171',
                      fontSize: 13,
                      fontWeight: 700,
                    }}>
                      {temp.available ? 'Disponible' : 'Reservado'}
                    </span>
                  </div>
                  {/* Date */}
                  {dateStr && (
                    <div style={{ color: '#9090a0', fontSize: 14, marginBottom: 6 }}>
                      {dateStr}
                    </div>
                  )}
                  {/* Price */}
                  {temp.price && (
                    <div style={{
                      color: '#c6a962',
                      fontSize: 22,
                      fontWeight: 700,
                    }}>
                      {formatPrice(temp.price, temp.currency)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {temporadas.length > 3 && (
            <div style={{ color: '#707080', fontSize: 14, marginTop: 8, textAlign: 'center' }}>
              +{temporadas.length - 3} temporada{temporadas.length - 3 > 1 ? 's' : ''} más
            </div>
          )}

          {/* Amenities */}
          {extras.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
              {extras.map((ex: string, i: number) => (
                <div key={i} style={{
                  backgroundColor: '#1c2b42',
                  color: '#e0e0ea',
                  padding: '5px 12px',
                  borderRadius: 5,
                  fontSize: 13,
                  fontWeight: 400,
                }}>
                  {ex}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom: Brand section */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{
            width: '100%',
            height: 1,
            backgroundColor: '#2a3a52',
            marginBottom: 10,
          }} />
          <div style={{
            color: '#c6a962',
            fontSize: 15,
            fontWeight: 700,
          }}>
            INMOBILIARIA FLORENCIA ZACARIA
          </div>
          <div style={{
            color: '#9696a0',
            fontSize: 13,
          }}>
            fzacaria.com.ar — Pinamar, Buenos Aires
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── STANDARD OG IMAGE (Venta / Alquiler) ──────────────────────
function renderStandardOG({ imageBase64, opLabel, tpLabel, title, property, detailsLine, priceText, extras, fonts }: any) {
  return (
    <div style={{
      width: 1200,
      height: 630,
      display: 'flex',
      flexDirection: 'row',
      backgroundColor: '#0a1628',
      fontFamily: fonts ? 'Carlito' : 'sans-serif',
      overflow: 'hidden',
    }}>
      {/* Left side - Property Image (60%) */}
      <div style={{
        width: 720,
        height: 630,
        display: 'flex',
        flexShrink: 0,
        position: 'relative',
      }}>
        {imageBase64 ? (
          <img
            src={imageBase64}
            width={720}
            height={630}
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: 720,
            height: 630,
            backgroundColor: '#1a2a40',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#4a5568',
            fontSize: 28,
          }}>
            Sin imagen
          </div>
        )}
        {/* Dark overlay bar at bottom */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: 720,
          height: 180,
          backgroundColor: 'rgba(0,0,0,0.7)',
        }} />
        {/* Info overlay on image bottom */}
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: 24,
          right: 24,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Badges */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div style={{
              backgroundColor: '#c6a962',
              color: '#ffffff',
              padding: '6px 16px',
              borderRadius: 6,
              fontSize: 16,
              fontWeight: 700,
            }}>
              {opLabel.toUpperCase()}
            </div>
            <div style={{
              backgroundColor: '#4a5568',
              color: '#ffffff',
              padding: '6px 16px',
              borderRadius: 6,
              fontSize: 16,
              fontWeight: 700,
            }}>
              {tpLabel}
            </div>
          </div>
          {/* Title */}
          <div style={{
            color: '#ffffff',
            fontSize: 30,
            fontWeight: 700,
            lineHeight: 1.2,
          }}>
            {title}
          </div>
          {/* Location */}
          <div style={{
            color: '#c6a962',
            fontSize: 18,
            marginTop: 4,
          }}>
            {property.location}
          </div>
          {/* Details */}
          {detailsLine && (
            <div style={{
              color: '#e0e0ea',
              fontSize: 17,
              marginTop: 6,
            }}>
              {detailsLine}
            </div>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div style={{
        width: 480,
        height: 630,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0d1b2e',
        paddingLeft: 28,
        paddingRight: 28,
        paddingTop: 28,
        paddingBottom: 20,
        justifyContent: 'space-between',
      }}>
        {/* Top section with content */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Price */}
          {priceText && (
            <div style={{
              backgroundColor: '#132240',
              borderRadius: 10,
              padding: '20px 18px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              borderLeft: '4px solid #c6a962',
            }}>
              <span style={{
                color: '#c6a962',
                fontSize: 36,
                fontWeight: 700,
              }}>
                {priceText}
              </span>
            </div>
          )}

          {/* Amenities */}
          {extras.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{
                color: '#c8c8d2',
                fontSize: 16,
                fontWeight: 700,
                marginBottom: 10,
              }}>
                AMENITIES
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {extras.map((ex: string, i: number) => (
                  <div key={i} style={{
                    backgroundColor: '#1c2b42',
                    color: '#ffffff',
                    padding: '6px 14px',
                    borderRadius: 6,
                    fontSize: 14,
                  }}>
                    {ex}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom: Brand section */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{
            width: '100%',
            height: 1,
            backgroundColor: '#2a3a52',
            marginBottom: 10,
          }} />
          <div style={{
            color: '#c6a962',
            fontSize: 15,
            fontWeight: 700,
          }}>
            INMOBILIARIA FLORENCIA ZACARIA
          </div>
          <div style={{
            color: '#9696a0',
            fontSize: 13,
          }}>
            fzacaria.com.ar — Pinamar, Buenos Aires
          </div>
        </div>
      </div>
    </div>
  )
}
