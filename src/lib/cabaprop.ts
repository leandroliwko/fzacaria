/**
 * Cabaprop API Integration - Utility functions
 * Handles API Key management, property formatting, and publishing
 * 
 * Cabaprop is the official real estate portal of CUCICBA
 * (Colegio Único de Corredores Inmobiliarios de la Ciudad de Buenos Aires)
 * 
 * Integration requires:
 * - API Key (generated in cabaprop.com.ar/admin → Configuración → Integración)
 * - CUCICBA matrícula number
 */

import { prisma } from '@/lib/prisma'

const CB_API_BASE = 'https://cabaprop.com.ar/api'

// Property type mapping for Cabaprop
const CB_TYPE_MAP: Record<string, string> = {
  casa: 'Casa',
  departamento: 'Departamento',
  chalet: 'Chalet',
  ph: 'PH',
  lote: 'Terreno / Lote',
  local: 'Local Comercial',
  galpon: 'Galpón',
  campo: 'Campo',
  oficina: 'Oficina',
  quinta: 'Quinta',
  hotel: 'Hotel',
}

const CB_OPERATION_MAP: Record<string, string> = {
  venta: 'Venta',
  alquiler: 'Alquiler',
  temporario: 'Alquiler temporal',
}

/**
 * Get Cabaprop settings from DB
 */
export async function getCabapropSettings(): Promise<{ apiKey: string; webhookUrl: string; matricula: string } | null> {
  try {
    const settings = await prisma.cabapropSettings.findFirst()
    if (settings?.apiKey) {
      return {
        apiKey: settings.apiKey,
        webhookUrl: settings.webhookUrl || '',
        matricula: settings.matricula || '',
      }
    }
  } catch {}
  return null
}

/**
 * Save Cabaprop settings to DB
 */
export async function saveCabapropSettings(data: { apiKey: string; webhookUrl?: string; matricula?: string }) {
  const existing = await prisma.cabapropSettings.findFirst()
  if (existing) {
    return prisma.cabapropSettings.update({
      where: { id: existing.id },
      data: {
        apiKey: data.apiKey,
        webhookUrl: data.webhookUrl || existing.webhookUrl,
        matricula: data.matricula || existing.matricula,
      },
    })
  }
  return prisma.cabapropSettings.create({
    data: {
      apiKey: data.apiKey,
      webhookUrl: data.webhookUrl || '',
      matricula: data.matricula || '',
    },
  })
}

/**
 * Build a Cabaprop-compatible property payload
 */
export function buildCabapropProperty(property: any): any {
  const tpLabel = CB_TYPE_MAP[property.type] || property.type
  const opLabel = CB_OPERATION_MAP[property.operation] || property.operation

  // Parse price
  let price = 0
  let currency = 'ARS'
  if (property.price) {
    const priceStr = String(property.price).replace(/\./g, '').replace(/,/g, '')
    if (priceStr.includes('U$S') || priceStr.includes('USD')) {
      currency = 'USD'
      price = parseInt(priceStr.replace(/[^0-9]/g, '')) || 0
    } else {
      price = parseInt(priceStr.replace(/[^0-9]/g, '')) || 0
    }
  }

  // For temporario without general price, use first temporada price
  if (property.operation === 'temporario' && !price && property.temporadas?.length) {
    const firstTemp = property.temporadas.find((t: any) => t.price)
    if (firstTemp) {
      price = parseInt(String(firstTemp.price).replace(/[^0-9]/g, '')) || 0
      currency = firstTemp.currency === 'ARS' ? 'ARS' : 'USD'
    }
  }

  // Build description
  const extras = property.extras ? property.extras.split(',').map((e: string) => e.trim()).filter(Boolean) : []
  let description = property.description || ''
  description += `\n\n${tpLabel} en ${opLabel.toLowerCase()} - ${property.location}`
  if (property.bedrooms > 0) description += `\n${property.bedrooms} dormitorios`
  if (property.bathrooms > 0) description += `, ${property.bathrooms} baños`
  if (property.area > 0) description += `, ${property.area} m²`
  if (extras.length > 0) description += `\nAmenities: ${extras.join(', ')}`

  // Add temporada pricing
  if (property.operation === 'temporario' && property.temporadas?.length) {
    description += '\n\nPrecios por temporada:\n'
    for (const t of property.temporadas) {
      const start = t.startDate instanceof Date ? t.startDate : new Date(t.startDate)
      const end = t.endDate instanceof Date ? t.endDate : new Date(t.endDate)
      const pText = t.price ? (t.currency === 'ARS' ? `$${t.price}` : `U$S ${t.price}`) : 'Consultar'
      const avail = t.available ? 'Disponible' : 'Reservado'
      description += `- ${t.name || 'Temporada'}: ${pText} (${start.toLocaleDateString('es-AR')} - ${end.toLocaleDateString('es-AR')}) ${avail}\n`
    }
  }

  description += '\n\nInmobiliaria Florencia Zacaría\nTel: (02255) 612345\nWhatsApp: +54 9 2255 612345\nwww.fzacaria.com.ar'

  // Get images
  const images: string[] = []
  if (property.image && property.image.startsWith('http')) {
    images.push(property.image)
  }
  if (property.images) {
    try {
      const parsed = JSON.parse(property.images)
      if (Array.isArray(parsed)) {
        parsed.filter((img: string) => img.startsWith('http') && img !== property.image).forEach((img: string) => {
          images.push(img)
        })
      }
    } catch {
      property.images.split(',').map((img: string) => img.trim()).filter((img: string) => img.startsWith('http') && img !== property.image).forEach((img: string) => {
        images.push(img)
      })
    }
  }

  return {
    title: `${opLabel} - ${tpLabel} en ${property.location}`,
    property_type: tpLabel,
    operation_type: opLabel,
    price,
    currency,
    location: property.location,
    latitude: property.latitude,
    longitude: property.longitude,
    bedrooms: property.bedrooms || 0,
    bathrooms: property.bathrooms || 0,
    total_area: property.area || 0,
    covered_area: property.coveredArea || 0,
    description: description.substring(0, 10000),
    images,
    code: property.code || '',
    featured: property.featured || false,
    url: `https://fzacaria.com.ar/propiedad/${property.id}`,
    // Temporada data for temporario properties
    temporadas: property.operation === 'temporario' && property.temporadas?.length
      ? property.temporadas.map((t: any) => ({
          name: t.name || 'Temporada',
          start_date: t.startDate ? new Date(t.startDate).toISOString().split('T')[0] : '',
          end_date: t.endDate ? new Date(t.endDate).toISOString().split('T')[0] : '',
          price: parseInt(String(t.price || '0').replace(/[^0-9]/g, '')) || 0,
          currency: t.currency === 'ARS' ? 'ARS' : 'USD',
          available: t.available !== false,
        }))
      : undefined,
  }
}

/**
 * Publish a property to Cabaprop via API
 */
export async function publishToCabaprop(apiKey: string, propertyData: any) {
  const res = await fetch(`${CB_API_BASE}/properties`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(propertyData),
  })

  const data = await res.json()

  if (!res.ok) {
    const errMsg = data.message || data.error || JSON.stringify(data)
    throw new Error(`Cabaprop publish failed: ${errMsg}`)
  }

  return data
}

/**
 * Update a property on Cabaprop
 */
export async function updateCabapropProperty(apiKey: string, cabapropId: string, propertyData: any) {
  const res = await fetch(`${CB_API_BASE}/properties/${cabapropId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(propertyData),
  })

  const data = await res.json()

  if (!res.ok) {
    const errMsg = data.message || data.error || JSON.stringify(data)
    throw new Error(`Cabaprop update failed: ${errMsg}`)
  }

  return data
}

/**
 * Remove a property from Cabaprop
 */
export async function removeFromCabaprop(apiKey: string, cabapropId: string) {
  const res = await fetch(`${CB_API_BASE}/properties/${cabapropId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(`Cabaprop remove failed: ${data.message || 'Unknown error'}`)
  }

  return true
}

/**
 * Get a property status from Cabaprop
 */
export async function getCabapropPropertyStatus(apiKey: string, cabapropId: string) {
  const res = await fetch(`${CB_API_BASE}/properties/${cabapropId}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })

  if (!res.ok) throw new Error('Failed to get Cabaprop property status')
  return res.json()
}

/**
 * Verify API key is valid by making a test request
 */
export async function verifyCabapropApiKey(apiKey: string): Promise<{ valid: boolean; info?: string }> {
  try {
    const res = await fetch(`${CB_API_BASE}/me`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    if (res.ok) {
      const data = await res.json()
      return { valid: true, info: data.name || data.email || 'Conectado' }
    }
    return { valid: false, info: 'API Key inválida' }
  } catch {
    return { valid: false, info: 'Error de conexión con Cabaprop' }
  }
}
