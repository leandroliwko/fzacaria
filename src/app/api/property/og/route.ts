import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const typeLabels: Record<string, string> = {
  casa: 'Casa', departamento: 'Depto', chalet: 'Chalet',
  ph: 'PH', lote: 'Lote', local: 'Local',
  campo: 'Campo', oficina: 'Oficina', quinta: 'Quinta', hotel: 'Hotel',
}
const operationLabels: Record<string, string> = {
  venta: 'Venta', alquiler: 'Alquiler', temporario: 'Temporario',
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    if (!url) return null
    if (url.startsWith('data:')) return null // Can't fetch base64 in OG image
    const res = await fetch(url, {
      headers: { 'User-Agent': 'InmobiliariaFZ/1.0' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch { return null }
}

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const property = await prisma.property.findUnique({ where: { id } })
    if (!property || !property.active) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const sharp = (await import('sharp')).default

    // Canvas dimensions for OG image (1200x630)
    const W = 1200
    const H = 630
    const NAVY = { r: 10, g: 22, b: 40 }
    const GOLD = { r: 198, g: 169, b: 98 }
    const WHITE = { r: 255, g: 255, b: 255 }
    const BG_LIGHT = { r: 245, g: 243, b: 238 }

    // Fetch main image
    let imageUrl = property.image || ''
    if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
      imageUrl = `https://fzacaria.com.ar/uploads/${imageUrl}`
    }

    const imgBuf = await fetchImageBuffer(imageUrl)

    // Create the composite image
    // Background: navy gradient
    const bgSvg = `<svg width="${W}" height="${H}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="rgb(${NAVY.r},${NAVY.g},${NAVY.b})"/>
          <stop offset="100%" stop-color="rgb(30,42,60)"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#bg)"/>
    </svg>`

    const compositor = sharp(Buffer.from(bgSvg)).resize(W, H)

    // Prepare the left image area (property photo)
    if (imgBuf) {
      try {
        const resizedImg = await sharp(imgBuf)
          .resize(680, H, { fit: 'cover', position: 'center' })
          .jpeg({ quality: 85 })
          .toBuffer()

        compositor.composite([{
          input: resizedImg,
          left: 0,
          top: 0,
        }])
      } catch { /* skip image if resize fails */ }
    }

    // Build the right panel as SVG overlay
    const opLabel = operationLabels[property.operation] || property.operation
    const tpLabel = typeLabels[property.type] || property.type

    // Price text
    let priceText = ''
    if (property.price && String(property.price).trim()) {
      priceText = String(property.price)
    } else if (property.operation === 'temporario' && property.temporadas?.length) {
      // Load temporadas if needed
      const propWithTemp = await prisma.property.findUnique({
        where: { id },
        include: { temporadas: { orderBy: [{ order: 'asc' }, { startDate: 'asc' }] } }
      })
      if (propWithTemp?.temporadas?.length) {
        const first = propWithTemp.temporadas[0]
        priceText = first.price ? `${first.currency === 'ARS' ? '$' : 'U$S'} ${first.price}` : 'Consultar'
      }
    }

    // Build amenities text (first 6)
    const extras = property.extras
      ? String(property.extras).split(',').map(e => e.trim()).filter(Boolean).slice(0, 6)
      : []

    // Build details line
    const details: string[] = []
    if (property.bedrooms > 0) details.push(`${property.bedrooms} Dorm.`)
    if (property.bathrooms > 0) details.push(`${property.bathrooms} Baños`)
    if (property.area > 0) details.push(`${property.area.toLocaleString()} m²`)

    const detailsLine = details.join('  ·  ')

    // Right panel SVG overlay
    const panelX = 700
    const panelW = W - panelX

    // Escape special XML characters
    const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

    const rightPanelSvg = `<svg width="${W}" height="${H}">
      <!-- Semi-transparent overlay on left image edge -->
      <defs>
        <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="rgb(${NAVY.r},${NAVY.g},${NAVY.b})" stop-opacity="0"/>
          <stop offset="100%" stop-color="rgb(${NAVY.r},${NAVY.g},${NAVY.b})" stop-opacity="1"/>
        </linearGradient>
      </defs>
      <rect x="580" y="0" width="150" height="${H}" fill="url(#fade)"/>

      <!-- Gold accent line -->
      <rect x="${panelX - 10}" y="80" width="3" height="470" fill="rgb(${GOLD.r},${GOLD.g},${GOLD.b})" rx="1.5"/>

      <!-- Operation badge -->
      <rect x="${panelX}" y="85" width="${Math.min(opLabel.length * 11 + 20, 120)}" height="30" fill="rgb(${GOLD.r},${GOLD.g},${GOLD.b})" rx="4"/>
      <text x="${panelX + 10}" y="105" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="white">${escapeXml(opLabel.toUpperCase())}</text>

      <!-- Type badge -->
      <rect x="${panelX + Math.min(opLabel.length * 11 + 30, 130)}" y="85" width="${Math.min(tpLabel.length * 11 + 20, 110)}" height="30" fill="rgb(74,85,104)" rx="4"/>
      <text x="${panelX + Math.min(opLabel.length * 11 + 40, 140)}" y="105" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="white">${escapeXml(tpLabel)}</text>

      <!-- Title (up to 2 lines) -->
      <text x="${panelX}" y="150" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="white">${escapeXml(property.title.substring(0, 28))}</text>
      ${property.title.length > 28 ? `<text x="${panelX}" y="178" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="white">${escapeXml(property.title.substring(28, 56))}</text>` : ''}

      <!-- Location -->
      <text x="${panelX}" y="${property.title.length > 28 ? 205 : 185}" font-family="Arial, sans-serif" font-size="14" fill="rgb(${GOLD.r},${GOLD.g},${GOLD.b})">${escapeXml(property.location)}</text>

      <!-- Details line -->
      <text x="${panelX}" y="${property.title.length > 28 ? 230 : 210}" font-family="Arial, sans-serif" font-size="13" fill="rgb(180,180,190)">${escapeXml(detailsLine)}</text>

      <!-- Price -->
      ${priceText ? `
      <rect x="${panelX}" y="${property.title.length > 28 ? 250 : 230}" width="${panelW - 20}" height="55" fill="rgba(198,169,98,0.12)" rx="6"/>
      <text x="${panelX + 12}" y="${property.title.length > 28 ? 287 : 267}" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="rgb(${GOLD.r},${GOLD.g},${GOLD.b})">${escapeXml(priceText)}</text>
      ` : ''}

      <!-- Amenities -->
      ${extras.length > 0 ? `
      <text x="${panelX}" y="${priceText ? (property.title.length > 28 ? 335 : 315) : (property.title.length > 28 ? 270 : 250)}" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="rgb(200,200,210)">AMENITIES</text>
      ${extras.map((ex, i) => `
        <circle cx="${panelX + 6}" cy="${(priceText ? (property.title.length > 28 ? 355 : 335) : (property.title.length > 28 ? 290 : 270)) + i * 22}" r="3" fill="rgb(${GOLD.r},${GOLD.g},${GOLD.b})"/>
        <text x="${panelX + 14}" y="${(priceText ? (property.title.length > 28 ? 359 : 339) : (property.title.length > 28 ? 294 : 274)) + i * 22}" font-family="Arial, sans-serif" font-size="12" fill="white">${escapeXml(ex)}</text>
      `).join('')}
      ` : ''}

      <!-- Bottom: Brand -->
      <rect x="${panelX}" y="${H - 65}" width="${panelW - 20}" height="1" fill="rgb(${GOLD.r},${GOLD.g},${GOLD.b})" opacity="0.5"/>
      <text x="${panelX}" y="${H - 40}" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="rgb(${GOLD.r},${GOLD.g},${GOLD.b})">INMOBILIARIA FLORENCIA ZACARIA</text>
      <text x="${panelX}" y="${H - 22}" font-family="Arial, sans-serif" font-size="10" fill="rgb(150,150,160)">fzacaria.com.ar · Pinamar, Buenos Aires</text>
    </svg>`

    const result = await compositor
      .composite([{
        input: Buffer.from(rightPanelSvg),
        left: 0,
        top: 0,
      }])
      .jpeg({ quality: 90 })
      .toBuffer()

    return new NextResponse(result, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  } catch (error: any) {
    console.error('OG image error:', error?.message || error)
    return NextResponse.json({ error: 'Error generating OG image' }, { status: 500 })
  }
}
