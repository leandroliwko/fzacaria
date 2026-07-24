import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jsPDF from 'jspdf'

// ── Labels ──────────────────────────────────────────────
const typeLabels: Record<string, string> = {
  casa: 'Casa', departamento: 'Departamento', chalet: 'Chalet',
  ph: 'PH', lote: 'Lote / Terreno', local: 'Local Comercial',
  campo: 'Campo', oficina: 'Oficina', quinta: 'Quinta', hotel: 'Hotel',
}
const operationLabels: Record<string, string> = {
  venta: 'Venta', alquiler: 'Alquiler', temporario: 'Temporario',
}

// ── Helpers ─────────────────────────────────────────────
function formatTempPrice(price: string, currency: string): string {
  if (!price) return 'Consultar'
  if (price.startsWith('U$S') || price.startsWith('$')) return price
  return `${currency === 'ARS' ? '$' : 'U$S'} ${price}`
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime()
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)))
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').substring(0, 30)
}

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    if (!url) return null
    if (url.startsWith('data:')) return url
    const res = await fetch(url, {
      headers: { 'User-Agent': 'InmobiliariaFZ/1.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    try {
      const sharp = (await import('sharp')).default
      const resized = await sharp(buf).resize(800, null, { withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer()
      return `data:image/jpeg;base64,${resized.toString('base64')}`
    } catch {
      return `data:image/jpeg;base64,${buf.toString('base64')}`
    }
  } catch { return null }
}

// ── Map builder using OSM tiles ─────────────────────────
async function buildMapImage(lat: number, lng: number): Promise<string | null> {
  try {
    const sharp = (await import('sharp')).default

    const zoom = 15
    const n = Math.pow(2, zoom)
    const cx = (lng + 180) / 360 * n
    const latRad = lat * Math.PI / 180
    const cy = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n

    const tileX0 = Math.floor(cx) - 1
    const tileY0 = Math.floor(cy)

    const tileBufs: Buffer[] = []
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const url = `https://tile.openstreetmap.org/${zoom}/${tileX0 + col}/${tileY0 + row}.png`
        try {
          const res = await fetch(url, {
            headers: { 'User-Agent': 'InmobiliariaFZ/1.0 (contact@fzacaria.com.ar)' },
            signal: AbortSignal.timeout(8000),
          })
          if (!res.ok) return null
          const buf = Buffer.from(await res.arrayBuffer())
          tileBufs.push(buf)
        } catch { return null }
      }
    }

    if (tileBufs.length < 6) return null

    const rawTiles: { data: Buffer; width: number; height: number }[] = []
    for (const buf of tileBufs) {
      const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true })
      rawTiles.push({ data, width: info.width, height: info.height })
    }

    const tw = rawTiles[0].width
    const th = rawTiles[0].height
    const fullW = tw * 3
    const fullH = th * 2
    const channels = 3

    const stitched = Buffer.alloc(fullW * fullH * channels, 230)

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const tile = rawTiles[row * 3 + col]
        for (let ty = 0; ty < tile.height; ty++) {
          const srcOff = ty * tile.width * channels
          const dstOff = ((row * th + ty) * fullW + col * tw) * channels
          tile.data.copy(stitched, dstOff, srcOff, srcOff + tw * channels)
        }
      }
    }

    const centerX = Math.round((cx - tileX0) * tw)
    const centerY = Math.round((cy - tileY0) * th)
    const markerR = 10
    for (let dy = -markerR; dy <= markerR; dy++) {
      for (let dx = -markerR; dx <= markerR; dx++) {
        if (dx * dx + dy * dy <= markerR * markerR) {
          const px = centerX + dx
          const py = centerY + dy
          if (px >= 0 && px < fullW && py >= 0 && py < fullH) {
            const off = (py * fullW + px) * channels
            stitched[off] = 220
            stitched[off + 1] = 50
            stitched[off + 2] = 50
          }
        }
      }
    }

    const jpg = await sharp(stitched, { raw: { width: fullW, height: fullH, channels } })
      .resize(540, 200, { fit: 'cover' })
      .jpeg({ quality: 85 })
      .toBuffer()

    return `data:image/jpeg;base64,${jpg.toString('base64')}`
  } catch (e) {
    console.error('Map build error:', e)
    return null
  }
}

// ── Main PDF builder ────────────────────────────────────
function buildPDF(property: any, mainImgB64: string | null, additionalImgs: string[], mapImgB64: string | null): Buffer {
  const doc = new jsPDF('p', 'pt', 'a4')
  const W = 595.28
  const H = 841.89
  const M = 40
  const CW = W - M * 2
  const FOOTER_H = 55
  const NAVY: [number, number, number] = [10, 22, 40]
  const GOLD: [number, number, number] = [109, 115, 87]
  const NAVY_L: [number, number, number] = [74, 85, 104]
  const BG: [number, number, number] = [245, 243, 238]
  const GREEN: [number, number, number] = [109, 115, 87]
  const RED: [number, number, number] = [239, 68, 68]
  const WHITE: [number, number, number] = [255, 255, 255]

  const opLabel = operationLabels[property.operation] || property.operation
  const tpLabel = typeLabels[property.type] || property.type
  const code = property.code && property.code !== 'PENDING' ? property.code : ''

  // Helper: ensure space, add page if needed
  function ensureSpace(y: number, needed: number): number {
    if (y + needed > H - FOOTER_H - 10) {
      doc.addPage()
      return M
    }
    return y
  }

  // Draw footer on current page
  function drawFooter() {
    const footerY = H - FOOTER_H
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(0.5)
    doc.line(M, footerY, W - M, footerY)

    doc.setTextColor(...NAVY)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('CONTACTO', M, footerY + 11)

    doc.setTextColor(...NAVY_L)
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.text('WhatsApp: +54 9 2255 612345', M, footerY + 21)
    doc.text('Tel: (02255) 612345', M, footerY + 30)

    doc.text('Pinamar, Buenos Aires', W / 2, footerY + 21)
    doc.textWithLink('www.fzacaria.com.ar', W / 2, footerY + 30, { url: 'https://fzacaria.com.ar' })

    doc.setTextColor(...GOLD)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('Inmobiliaria Florencia Zacaria', W - M, footerY + 21, { align: 'right' })
    doc.setTextColor(...NAVY_L)
    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    doc.text('Martillera Matriculada', W - M, footerY + 30, { align: 'right' })
  }

  // ═══════════════════════════════════════════════════════
  //  1. HEADER BAR
  // ═══════════════════════════════════════════════════════
  doc.setFillColor(...NAVY)
  doc.roundedRect(M, M, CW, 26, 4, 4, 'F')
  doc.setTextColor(...GOLD)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('INMOBILIARIA FLORENCIA ZACARIA', M + 8, M + 17)
  if (code) {
    doc.setFontSize(8)
    doc.text(code, W - M - 8, M + 17, { align: 'right' })
  }

  let y = M + 34

  // ═══════════════════════════════════════════════════════
  //  2. TWO-COLUMN: IMAGE (left 52%) + DETAILS (right 46%)
  // ═══════════════════════════════════════════════════════
  const imgColW = CW * 0.52
  const detailX = M + imgColW + 8
  const detailW = CW - imgColW - 8
  const imgH = 195

  // ── Left: Main image ─────────────────────────────────
  if (mainImgB64) {
    doc.addImage(mainImgB64, 'JPEG', M, y, imgColW, imgH, undefined, 'MEDIUM')
  } else {
    doc.setFillColor(...BG)
    doc.rect(M, y, imgColW, imgH, 'F')
    doc.setTextColor(...NAVY_L)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.text('Imagen no disponible', M + imgColW / 2, y + imgH / 2, { align: 'center' })
  }

  // ── Right: Property details ──────────────────────────
  let ry = y + 2

  // Badges row
  doc.setFillColor(...GOLD)
  doc.roundedRect(detailX, ry, 56, 16, 3, 3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text(opLabel.toUpperCase(), detailX + 4, ry + 11)

  doc.setFillColor(...NAVY)
  const tpBadgeW = Math.min(doc.getTextWidth(tpLabel) + 10, 80)
  doc.roundedRect(detailX + 60, ry, tpBadgeW, 16, 3, 3, 'F')
  doc.text(tpLabel, detailX + 64, ry + 11)
  ry += 28

  // Title
  doc.setTextColor(...NAVY)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  const titleLines = doc.splitTextToSize(property.title, detailW)
  doc.text(titleLines.slice(0, 2), detailX, ry)
  ry += Math.min(titleLines.length, 2) * 14 + 3

  // Location
  doc.setTextColor(...NAVY_L)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.text(property.location, detailX, ry)
  ry += 12

  // ── Price (for venta/alquiler) ──────────────────────────
  if (property.price && String(property.price).trim() && property.operation !== 'temporario') {
    doc.setTextColor(...GOLD)
    doc.setFontSize(15)
    doc.setFont('helvetica', 'bold')
    doc.text(String(property.price), detailX, ry)
    ry += 18
  }

  // ── Detail cards ─────────────────────────────────────
  const details: { label: string; value: string }[] = []
  if (property.bedrooms > 0) details.push({ label: 'Dormitorios', value: String(property.bedrooms) })
  if (property.bathrooms > 0) details.push({ label: 'Baños', value: String(property.bathrooms) })
  if (property.area > 0) details.push({ label: 'Superficie', value: `${property.area.toLocaleString()} m\u00B2` })
  if (property.coveredArea) details.push({ label: 'Cubierta', value: `${property.coveredArea.toLocaleString()} m\u00B2` })

  if (details.length > 0) {
    const cardW = detailW / 2 - 2
    const cardH = 26
    details.forEach((d, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const cx = detailX + col * (cardW + 4)
      const cy = ry + row * (cardH + 3)

      doc.setFillColor(...BG)
      doc.roundedRect(cx, cy, cardW, cardH, 3, 3, 'F')
      doc.setTextColor(...NAVY_L)
      doc.setFontSize(5.5)
      doc.setFont('helvetica', 'normal')
      doc.text(d.label, cx + 5, cy + 9)
      doc.setTextColor(...NAVY)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(d.value, cx + 5, cy + 20)
    })
    ry += Math.ceil(details.length / 2) * (cardH + 3) + 2
  }

  y = Math.max(y + imgH + 6, ry + 4)

  // ═══════════════════════════════════════════════════════
  //  3. TEMPORADAS SECTION (full width, detailed)
  // ═══════════════════════════════════════════════════════
  if (property.operation === 'temporario' && property.temporadas?.length) {
    y = ensureSpace(y, 30)

    // Section header
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(0.7)
    doc.line(M, y, W - M, y)
    y += 8

    doc.setTextColor(...NAVY)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Disponibilidad por Temporada', M, y)
    y += 14

    // Each temporada as a card
    for (const t of property.temporadas) {
      const sDate = t.startDate instanceof Date ? t.startDate : new Date(t.startDate)
      const eDate = t.endDate instanceof Date ? t.endDate : new Date(t.endDate)
      const days = daysBetween(sDate, eDate)
      const pText = formatTempPrice(t.price, t.currency)

      y = ensureSpace(y, 58)

      // Card background
      const cardH = 52
      doc.setFillColor(...BG)
      doc.roundedRect(M, y, CW, cardH, 4, 4, 'F')

      // Season number badge
      const idx = property.temporadas.indexOf(t) + 1
      doc.setFillColor(...NAVY)
      doc.roundedRect(M + 6, y + 5, 18, 14, 3, 3, 'F')
      doc.setTextColor(...WHITE)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text(String(idx), M + 15, y + 15, { align: 'center' })

      // Season name
      doc.setTextColor(...NAVY)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(t.name || 'Temporada', M + 30, y + 15)

      // Availability badge
      const availText = t.available ? 'Disponible' : 'Reservado'
      const availColor = t.available ? GREEN : RED
      const availW = doc.getTextWidth(availText) + 12
      const availX = W - M - availW - 6
      doc.setFillColor(...availColor)
      doc.roundedRect(availX, y + 4, availW, 14, 3, 3, 'F')
      doc.setTextColor(...WHITE)
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'bold')
      doc.text(availText, availX + 6, y + 14)

      // Row 2: Ingreso - Duration - Egreso
      const row2Y = y + 27

      // Ingreso
      doc.setTextColor(...NAVY_L)
      doc.setFontSize(5.5)
      doc.setFont('helvetica', 'normal')
      doc.text('Ingreso', M + 30, row2Y)
      doc.setTextColor(...NAVY)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.text(formatDateShort(sDate), M + 30, row2Y + 9)

      // Duration
      const durX = M + CW * 0.33
      doc.setTextColor(...NAVY_L)
      doc.setFontSize(5.5)
      doc.setFont('helvetica', 'normal')
      doc.text('Duracion', durX, row2Y)
      doc.setTextColor(...NAVY)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.text(`${days} dias`, durX, row2Y + 9)

      // Egreso
      const egX = M + CW * 0.55
      doc.setTextColor(...NAVY_L)
      doc.setFontSize(5.5)
      doc.setFont('helvetica', 'normal')
      doc.text('Egreso', egX, row2Y)
      doc.setTextColor(...NAVY)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.text(formatDateShort(eDate), egX, row2Y + 9)

      // Price (right-aligned)
      doc.setTextColor(...GOLD)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(pText, W - M - 6, row2Y + 6, { align: 'right' })

      y += cardH + 4
    }

    // "Consultá por disponibilidad..." note
    y = ensureSpace(y, 14)
    doc.setTextColor(...NAVY_L)
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'italic')
    doc.text('Consulta por disponibilidad y precios segun temporada', M, y)
    y += 8
  }

  // ═══════════════════════════════════════════════════════
  //  4. GOLD DIVIDER
  // ═══════════════════════════════════════════════════════
  y = ensureSpace(y, 12)
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.7)
  doc.line(M, y, W - M, y)
  y += 8

  // ═══════════════════════════════════════════════════════
  //  5. DESCRIPTION (full, no truncation)
  // ═══════════════════════════════════════════════════════
  const desc = property.description && property.description.trim()
    ? property.description
    : `Excelente ${tpLabel.toLowerCase()} ubicado/a en ${property.location}.` +
      `${property.bedrooms > 0 ? ` Cuenta con ${property.bedrooms} dormitorio${property.bedrooms > 1 ? 's' : ''}` : ''}` +
      `${property.bathrooms > 0 ? `, ${property.bathrooms} baño${property.bathrooms > 1 ? 's' : ''}` : ''}` +
      `${property.area > 0 ? ` y ${property.area.toLocaleString()} m\u00B2 de superficie` : ''}.`

  y = ensureSpace(y, 25)
  doc.setTextColor(...NAVY)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Descripcion', M, y)
  y += 12

  doc.setTextColor(...NAVY_L)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  const descLines = doc.splitTextToSize(desc, CW)

  // Render all description lines with page break handling
  for (let i = 0; i < descLines.length; i++) {
    y = ensureSpace(y, 10)
    doc.text(descLines[i], M, y)
    y += 10
  }
  y += 6

  // ═══════════════════════════════════════════════════════
  //  6. AMENITIES Y CARACTERISTICAS + INFO LEGAL
  // ═══════════════════════════════════════════════════════
  const extras = property.extras
    ? String(property.extras).split(',').map((e: string) => e.trim()).filter(Boolean)
    : []
  const features = property.features
    ? String(property.features).split(',').map((f: string) => f.trim()).filter(Boolean)
    : []

  const hasAmenities = extras.length > 0
  const hasFeatures = features.length > 0

  if (hasAmenities || hasFeatures) {
    const leftColW = hasFeatures ? CW * 0.55 : CW
    const rightColX = M + leftColW + 6
    const rightColW = CW - leftColW - 6

    y = ensureSpace(y, 30)

    if (hasAmenities) {
      doc.setTextColor(...NAVY)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('Amenities y Caracteristicas', M, y)

      doc.setTextColor(...NAVY_L)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      const amenCols = 2
      const amenColW = leftColW / amenCols
      const amenLineH = 11
      extras.forEach((ex: string, i: number) => {
        const col = i % amenCols
        const row = Math.floor(i / amenCols)
        const textY = y + 13 + row * amenLineH
        // Check page break
        if (textY > H - FOOTER_H - 20) {
          // Would overflow - skip remaining for now (or add page)
          return
        }
        doc.text(`\u2022 ${ex}`, M + col * amenColW, textY)
      })
    }

    if (hasFeatures) {
      doc.setTextColor(...NAVY)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('Informacion Legal', rightColX, y)

      doc.setTextColor(...NAVY_L)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      const featLineH = 11
      features.forEach((f: string, i: number) => {
        const textY = y + 13 + i * featLineH
        if (textY > H - FOOTER_H - 20) return
        doc.text(`\u2713 ${f}`, rightColX, textY)
      })

      // "Consultar credito" at end of legal
      const creditoY = y + 13 + features.length * featLineH
      if (creditoY < H - FOOTER_H - 20) {
        doc.setTextColor(...GOLD)
        doc.setFontSize(6.5)
        doc.setFont('helvetica', 'italic')
        doc.text('Consultar credito', rightColX, creditoY)
      }
    }

    const amenRows = hasAmenities ? Math.ceil(extras.length / 2) : 0
    const featRows = hasFeatures ? features.length + 1 : 0  // +1 for "Consultar credito"
    y += 13 + Math.max(amenRows, featRows) * 11 + 8
  }

  // ═══════════════════════════════════════════════════════
  //  7. ADDITIONAL IMAGES GALLERY
  // ═══════════════════════════════════════════════════════
  if (additionalImgs.length > 0) {
    y = ensureSpace(y, 20)
    doc.setTextColor(...NAVY)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Galeria de Imagenes', M, y)
    y += 10

    // Show up to 4 additional images in a 2x2 grid
    const maxImgs = Math.min(additionalImgs.length, 6)
    const imgPerRow = maxImgs <= 3 ? maxImgs : 3
    const gap = 4
    const galleryW = (CW - gap * (imgPerRow - 1)) / imgPerRow
    const galleryH = galleryW * 0.65  // aspect ratio

    for (let i = 0; i < maxImgs; i++) {
      const col = i % imgPerRow
      const row = Math.floor(i / imgPerRow)

      if (row > 0 && col === 0) {
        y = ensureSpace(y, galleryH + gap)
      }

      const ix = M + col * (galleryW + gap)
      const iy = y + row * (galleryH + gap)

      if (iy + galleryH > H - FOOTER_H - 10) break

      try {
        doc.addImage(additionalImgs[i], 'JPEG', ix, iy, galleryW, galleryH, undefined, 'MEDIUM')
      } catch {
        doc.setFillColor(...BG)
        doc.rect(ix, iy, galleryW, galleryH, 'F')
      }
    }

    const totalRows = Math.ceil(maxImgs / imgPerRow)
    y += totalRows * (galleryH + gap) + 4
  }

  // ═══════════════════════════════════════════════════════
  //  8. MAP
  // ═══════════════════════════════════════════════════════
  y = ensureSpace(y, 150)

  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.5)
  doc.line(M, y, W - M, y)
  y += 8

  doc.setTextColor(...NAVY)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Ubicacion', M, y)

  const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(property.location + ' Buenos Aires Argentina')}`
  doc.setTextColor(...GOLD)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.textWithLink('Ver en Google Maps >', W - M, y, { url: mapsUrl, align: 'right' })
  y += 12

  const mapH = 130
  if (y + mapH > H - FOOTER_H - 10) {
    doc.addPage()
    y = M
  }

  if (mapImgB64) {
    doc.addImage(mapImgB64, 'JPEG', M, y, CW, mapH, undefined, 'MEDIUM')
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.rect(M, y, CW, mapH)
    y += mapH + 4
  } else {
    doc.setFillColor(...BG)
    doc.rect(M, y, CW, 80, 'F')
    doc.setTextColor(...NAVY_L)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'italic')
    doc.text(property.location, M + CW / 2, y + 40, { align: 'center' })
    y += 86
  }

  // ═══════════════════════════════════════════════════════
  //  9. FOOTER on all pages
  // ═══════════════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    drawFooter()
  }

  // ── Output ────────────────────────────────────────────
  const arrBuf = doc.output('arraybuffer')
  return Buffer.from(arrBuf)
}

// ── Route handler ───────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const property = await prisma.property.findUnique({
      where: { id },
      include: { temporadas: { orderBy: [{ order: 'asc' }, { startDate: 'asc' }] } },
    })

    if (!property || !property.active) {
      return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 })
    }

    // Resolve main image URL
    let imageUrl = property.image || ''
    if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
      imageUrl = `https://fzacaria.com.ar/uploads/${imageUrl}`
    }

    // Resolve additional images from the images JSON field
    let additionalImageUrls: string[] = []
    try {
      const raw = property.images ? JSON.parse(property.images) : []
      if (Array.isArray(raw)) {
        additionalImageUrls = raw
          .filter((img: string) => img && img !== property.image)
          .slice(0, 6)
          .map((img: string) => {
            if (img.startsWith('http') || img.startsWith('data:')) return img
            return `https://fzacaria.com.ar/uploads/${img}`
          })
      }
    } catch { /* ignore parse errors */ }

    // Fetch all images and map in parallel
    const fetchPromises = [
      fetchImageAsBase64(imageUrl).catch(() => null),
      buildMapImage(property.latitude, property.longitude).catch(() => null),
      ...additionalImageUrls.map((url: string) => fetchImageAsBase64(url).catch(() => null)),
    ]

    const results = await Promise.all(fetchPromises)
    const mainImgB64 = results[0] as string | null
    const mapImgB64 = results[1] as string | null
    const additionalImgs = results.slice(2).filter(Boolean) as string[]

    const pdfBuf = buildPDF(property, mainImgB64, additionalImgs, mapImgB64)

    const filename = `${property.code && property.code !== 'PENDING' ? property.code : 'propiedad'}-${slugify(property.title)}.pdf`

    return new NextResponse(pdfBuf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch (error: any) {
    console.error('PDF generation error:', error?.message || error)
    return NextResponse.json({ error: 'Error generando PDF', details: error?.message || String(error) }, { status: 500 })
  }
}
