'use client'

import jsPDF from 'jspdf'

interface Temporada {
  name: string
  startDate: string
  endDate: string
  price: string
  currency: string
  available: boolean
}

interface Property {
  id: string
  title: string
  type: string
  operation: string
  price: string
  location: string
  bedrooms: number
  bathrooms: number
  area: number
  image: string
  images: string
  description: string
  extras: string
  features: string
  coveredArea?: number
  totalArea?: number
  code?: string
  latitude?: number
  longitude?: number
  temporadas?: Temporada[]
}

const typeLabels: Record<string, string> = {
  casa: 'Casa',
  departamento: 'Departamento',
  chalet: 'Chalet',
  ph: 'PH',
  lote: 'Lote / Terreno',
  local: 'Local Comercial',
  galpon: 'Galpón',
  campo: 'Campo',
  oficina: 'Oficina',
  quinta: 'Quinta',
  hotel: 'Hotel',
}

const operationLabels: Record<string, string> = {
  venta: 'Venta',
  alquiler: 'Alquiler',
  temporario: 'Temporario',
}

function formatTempPrice(price: string, currency: string): string {
  if (!price) return ''
  if (price.startsWith('U$S') || price.startsWith('$')) return price
  const symbol = currency === 'ARS' ? '$' : 'U$S'
  return `${symbol} ${price}`
}

function formatDate(dateStr: string): string {
  const d = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function loadImageAsBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('No canvas context'))
      ctx.drawImage(img, 0, 0)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      resolve(dataUrl)
    }
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = url
  })
}

export async function generatePropertyPDF(property: Property): Promise<void> {
  const doc = new jsPDF('p', 'pt', 'a4')
  const pageW = 595.28
  const contentW = pageW - 80
  const leftMargin = 40

  // Colors
  const NAVY = [10, 22, 40]
  const GOLD = [198, 169, 98]
  const NAVY_LIGHT = [74, 85, 104]

  const opLabel = operationLabels[property.operation] || property.operation
  const typeLabel = typeLabels[property.type] || property.type

  // === HEADER BAR ===
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, pageW, 60, 'F')
  doc.setTextColor(...GOLD)
  doc.setFontSize(17)
  doc.setFont('helvetica', 'bold')
  doc.text('Inmobiliaria Florencia Zacaria', leftMargin, 28)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Martillera Matriculada - Pinamar, Buenos Aires', leftMargin, 44)

  if (property.code && property.code !== 'PENDING') {
    doc.setTextColor(...GOLD)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(property.code, pageW - leftMargin, 28, { align: 'right' })
  }

  let yPos = 70

  // === MAIN IMAGE ===
  const mainImageUrl = property.image?.startsWith('http')
    ? property.image
    : property.image?.startsWith('data:')
      ? property.image
      : null

  if (mainImageUrl) {
    try {
      const imgData = await loadImageAsBase64(mainImageUrl)
      const maxImgH = 280
      // Add image maintaining aspect ratio
      doc.addImage(imgData, 'JPEG', leftMargin, yPos, contentW, maxImgH, undefined, 'MEDIUM')
      yPos += maxImgH + 10
    } catch {
      // Image failed, continue without
    }
  }

  // === BADGES ===
  doc.setFillColor(...GOLD)
  doc.roundedRect(leftMargin, yPos, 90, 24, 4, 4, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(opLabel.toUpperCase(), leftMargin + 8, yPos + 16)

  doc.setFillColor(...NAVY)
  doc.roundedRect(leftMargin + 98, yPos, 120, 24, 4, 4, 'F')
  doc.text(typeLabel, leftMargin + 106, yPos + 16)

  yPos += 34

  // === TITLE ===
  doc.setTextColor(...NAVY)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  const titleLines = doc.splitTextToSize(property.title, contentW)
  doc.text(titleLines, leftMargin, yPos)
  yPos += titleLines.length * 24 + 4

  // === LOCATION ===
  doc.setTextColor(...NAVY_LIGHT)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(property.location, leftMargin, yPos)
  yPos += 18

  // === PRICE ===
  if (property.price && property.price.trim() !== '') {
    doc.setTextColor(...GOLD)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text(property.price, leftMargin, yPos)
    yPos += 28
  } else if (property.operation === 'temporario' && property.temporadas && property.temporadas.length > 0) {
    doc.setTextColor(...NAVY)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Precios por Temporada', leftMargin, yPos)
    yPos += 18

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    for (const temp of property.temporadas) {
      const priceText = temp.price ? formatTempPrice(temp.price, temp.currency) : 'Consultar'
      const dateText = `${formatDate(temp.startDate)} - ${formatDate(temp.endDate)}`
      const availText = temp.available ? 'Disponible' : 'Reservado'

      doc.setTextColor(...NAVY_LIGHT)
      doc.text(`${temp.name || 'Temporada'}: `, leftMargin + 10, yPos, { continued: true })
      doc.setTextColor(...GOLD)
      doc.setFont('helvetica', 'bold')
      doc.text(`${priceText} `, { continued: true })
      doc.setTextColor(...NAVY_LIGHT)
      doc.setFont('helvetica', 'normal')
      doc.text(`(${dateText}) `, { continued: true })
      doc.setTextColor(temp.available ? 34 : 239, temp.available ? 197 : 68, temp.available ? 94 : 68)
      doc.setFont('helvetica', 'bold')
      doc.text(availText)
      yPos += 14
    }
    yPos += 4
  }

  // === DIVIDER ===
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(1)
  doc.line(leftMargin, yPos, pageW - leftMargin, yPos)
  yPos += 12

  // === DETAILS GRID ===
  const details: { label: string; value: string }[] = []
  if (property.bedrooms > 0) details.push({ label: 'Dormitorios', value: String(property.bedrooms) })
  if (property.bathrooms > 0) details.push({ label: 'Ba\u00f1os', value: String(property.bathrooms) })
  if (property.area > 0) details.push({ label: 'Superficie', value: `${property.area.toLocaleString()} m\u00b2` })
  if (property.coveredArea) details.push({ label: 'Cubierta', value: `${property.coveredArea.toLocaleString()} m\u00b2` })
  if (property.totalArea) details.push({ label: 'Total', value: `${property.totalArea.toLocaleString()} m\u00b2` })

  if (details.length > 0) {
    const colW = contentW / 3
    details.forEach((d, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      const x = leftMargin + col * colW
      const y = yPos + row * 42

      doc.setFillColor(240, 237, 232)
      doc.roundedRect(x + 4, y, colW - 8, 36, 6, 6, 'F')
      doc.setTextColor(...NAVY_LIGHT)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(d.label, x + 12, y + 12)
      doc.setTextColor(...NAVY)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(d.value, x + 12, y + 28)
    })
    yPos += Math.ceil(details.length / 3) * 42 + 10
  }

  // === DESCRIPTION ===
  const description = property.description ||
    `Excelente ${typeLabel.toLowerCase()} ubicado/a en ${property.location}. ` +
    `Esta propiedad cuenta con${property.bedrooms > 0 ? ` ${property.bedrooms} dormitorio${property.bedrooms > 1 ? 's' : ''}` : ''}` +
    `${property.bedrooms > 0 && property.bathrooms > 0 ? ',' : ''}` +
    `${property.bathrooms > 0 ? ` ${property.bathrooms} ba\u00f1o${property.bathrooms > 1 ? 's' : ''}` : ''}` +
    `${property.area > 0 ? ` y una superficie de ${property.area.toLocaleString()} m\u00b2` : ''}. ` +
    `La propiedad se encuentra en excelente estado de conservaci\u00f3n y ofrece espacios amplios y luminosos.`

  doc.setTextColor(...NAVY)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Descripci\u00f3n', leftMargin, yPos)
  yPos += 16

  doc.setTextColor(...NAVY_LIGHT)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const descLines = doc.splitTextToSize(description, contentW)
  doc.text(descLines, leftMargin, yPos)
  yPos += descLines.length * 13 + 8

  // === AMENITIES ===
  const extrasArray = property.extras
    ? property.extras.split(',').map(e => e.trim()).filter(Boolean)
    : []

  if (extrasArray.length > 0) {
    doc.setTextColor(...NAVY)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Amenities y Caracter\u00edsticas', leftMargin, yPos)
    yPos += 18

    doc.setTextColor(...NAVY_LIGHT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const amenityPerRow = 3
    const amenityW = contentW / amenityPerRow
    extrasArray.forEach((extra, i) => {
      const col = i % amenityPerRow
      const row = Math.floor(i / amenityPerRow)
      const x = leftMargin + col * amenityW
      const y = yPos + row * 16
      doc.text(`\u2713 ${extra}`, x, y)
    })
    yPos += Math.ceil(extrasArray.length / amenityPerRow) * 16 + 10
  }

  // === MAP ===
  if (yPos > 580) {
    doc.addPage()
    yPos = 40
  }

  doc.setTextColor(...NAVY)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Ubicaci\u00f3n', leftMargin, yPos)
  yPos += 18

  const lat = property.latitude || -37.1067
  const lng = property.longitude || -56.8688
  try {
    const mapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=500x250&maptype=mapnik&markers=${lat},${lng},red-marker`
    const mapData = await loadImageAsBase64(mapUrl)
    doc.addImage(mapData, 'PNG', leftMargin, yPos, contentW, 200)
    yPos += 210
  } catch {
    // Map failed
  }

  const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(property.location + ' Buenos Aires Argentina')}`
  doc.setTextColor(...GOLD)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.textWithLink('Ver en Google Maps \u2192', leftMargin, yPos, { url: mapsUrl })
  yPos += 14

  // === FOOTER ===
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.5)
  doc.line(leftMargin, 780, pageW - leftMargin, 780)
  doc.setTextColor(...NAVY_LIGHT)
  doc.setFontSize(8)
  doc.text('Inmobiliaria Florencia Zacaria - Pinamar, Buenos Aires', leftMargin, 794)
  doc.textWithLink('www.fzacaria.com.ar', pageW - leftMargin, 794, { url: 'https://fzacaria.com.ar', align: 'right' })
  doc.text('Tel: (02255) 612345 - WhatsApp: +54 9 2255 612345', leftMargin, 806)

  // Save
  const filename = `${property.code && property.code !== 'PENDING' ? property.code : 'propiedad'}-${property.title.replace(/\s+/g, '-').toLowerCase().substring(0, 30)}.pdf`
  doc.save(filename)
}
