/**
 * Mercado Libre API Integration - Utility functions
 * Handles OAuth token management, category mapping, and item formatting
 */

import { prisma } from '@/lib/prisma'

const ML_API_BASE = 'https://api.mercadolibre.com'
const ML_AUTH_URL = 'https://auth.mercadolibre.com.ar'

// ML leaf category IDs for real estate in Argentina (MLA)
// MUST be leaf categories — ML rejects non-leaf categories
// Structure: Inmuebles → [Tipo] → [Operación] → Propiedades Individuales (for venta with sub-cats)
const ML_CATEGORIES: Record<string, Record<string, string>> = {
  venta: {
    casa: 'MLA401685',         // Casas → Venta → Propiedades Individuales (LEAF)
    departamento: 'MLA401686', // Departamentos → Venta → Propiedades Individuales (LEAF)
    chalet: 'MLA401685',       // Chalets → Casas Venta Prop Ind (LEAF)
    ph: 'MLA105182',           // PH → Venta (LEAF)
    lote: 'MLA401687',         // Terrenos → Venta → Propiedades Individuales (LEAF)
    local: 'MLA79244',         // Locales → Venta (LEAF)
    galpon: 'MLA79244',        // Galpones → Locales Venta (LEAF)
    campo: 'MLA401687',        // Campos → Terrenos Venta Prop Ind (LEAF)
    oficina: 'MLA50540',       // Oficinas → Venta (has sub-cats but works)
    quinta: 'MLA401685',       // Quintas → Casas Venta Prop Ind (LEAF)
    hotel: 'MLA79244',         // Hoteles → Locales Venta (LEAF)
  },
  alquiler: {
    casa: 'MLA1467',           // Casas → Alquiler (LEAF)
    departamento: 'MLA1473',   // Departamentos → Alquiler (LEAF)
    chalet: 'MLA1467',         // Chalets → Casas Alquiler (LEAF)
    ph: 'MLA105181',           // PH → Alquiler (LEAF)
    lote: 'MLA1494',           // Terrenos → Alquiler (LEAF)
    local: 'MLA79243',         // Locales → Alquiler (LEAF)
    galpon: 'MLA79243',        // Galpones → Locales Alquiler (LEAF)
    campo: 'MLA1494',          // Campos → Terrenos Alquiler (LEAF)
    oficina: 'MLA50539',       // Oficinas → Alquiler (LEAF)
    quinta: 'MLA1467',         // Quintas → Casas Alquiler (LEAF)
    hotel: 'MLA79243',         // Hoteles → Locales Alquiler (LEAF)
  },
  temporario: {
    casa: 'MLA50278',          // Casas → Alquiler Temporario (LEAF)
    departamento: 'MLA50279',  // Departamentos → Alquiler Temporario (LEAF)
    chalet: 'MLA50278',
    ph: 'MLA50279',
    lote: 'MLA1494',
    local: 'MLA79243',
    galpon: 'MLA79243',
    campo: 'MLA1494',
    oficina: 'MLA50539',
    quinta: 'MLA50278',
    hotel: 'MLA79243',
  },
}

// ML listing type — will be resolved dynamically via API
const ML_LISTING_TYPES: Record<string, string> = {
  venta: 'silver',
  alquiler: 'silver',
  temporario: 'silver',
}

/**
 * Get available listing types for a category from ML API.
 * Tries multiple endpoints and returns the listing type ID with available quota.
 * Prefers free listings first, then paid ones.
 */
export async function getAvailableListingType(accessToken: string, categoryId: string): Promise<string> {
  // List of listing types to try in order of preference (cheapest first)
  const listingTypePreference = ['free', 'silver', 'gold', 'gold_special', 'gold_pro']

  try {
    // First, try the /users/me/available_listing_types endpoint
    const res = await fetch(`${ML_API_BASE}/users/me/available_listing_types?category_id=${categoryId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    })

    console.log('[ML getAvailableListingType] API status:', res.status)

    if (res.ok) {
      const data = await res.json()
      console.log('[ML getAvailableListingType] Response:', JSON.stringify(data))

      if (Array.isArray(data) && data.length > 0) {
        // Look through available types in our preference order
        for (const pref of listingTypePreference) {
          const found = data.find((lt: any) => lt.listing_type_id === pref)
          if (found) {
            console.log('[ML getAvailableListingType] Found available type:', found.listing_type_id)
            return found.listing_type_id
          }
        }
        // Use first available if none in our preference list
        const first = data[0]?.listing_type_id
        if (first) {
          console.log('[ML getAvailableListingType] Using first available:', first)
          return first
        }
      }
    } else {
      const errText = await res.text()
      console.log('[ML getAvailableListingType] API error response:', res.status, errText)
    }

    // Second attempt: try with explicit user ID
    try {
      const meRes = await fetch(`${ML_API_BASE}/users/me`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      })
      if (meRes.ok) {
        const meData = await meRes.json()
        const userId = meData.id
        const res2 = await fetch(`${ML_API_BASE}/users/${userId}/available_listing_types?category_id=${categoryId}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        })
        if (res2.ok) {
          const data2 = await res2.json()
          console.log('[ML getAvailableListingType] Via userId response:', JSON.stringify(data2))
          if (Array.isArray(data2) && data2.length > 0) {
            for (const pref of listingTypePreference) {
              const found = data2.find((lt: any) => lt.listing_type_id === pref)
              if (found) {
                console.log('[ML getAvailableListingType] Found via userId:', found.listing_type_id)
                return found.listing_type_id
              }
            }
            const first = data2[0]?.listing_type_id
            if (first) return first
          }
        }
      }
    } catch (e: any) {
      console.log('[ML getAvailableListingType] userId attempt failed:', e.message)
    }

    // Third attempt: validate each listing type directly
    console.log('[ML getAvailableListingType] Trying direct validation for each type...')
    for (const ltId of listingTypePreference) {
      try {
        const validateRes = await fetch(`${ML_API_BASE}/items/validate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: 'Test',
            category_id: categoryId,
            price: 1,
            currency_id: 'ARS',
            available_quantity: 1,
            condition: 'not_specified',
            listing_type_id: ltId,
          }),
        })
        const valData = await validateRes.json()
        console.log(`[ML getAvailableListingType] Validate ${ltId}:`, validateRes.status, JSON.stringify(valData))
        if (validateRes.ok) {
          console.log('[ML getAvailableListingType] Validated type:', ltId)
          return ltId
        }
      } catch (e: any) {
        console.log(`[ML getAvailableListingType] Validate ${ltId} failed:`, e.message)
      }
    }

    console.log('[ML getAvailableListingType] No types available, falling back to free')
    return 'free'
  } catch (error: any) {
    console.error('[ML getAvailableListingType] Error:', error.message)
    return 'free'
  }
}

// Property type labels
const typeLabels: Record<string, string> = {
  casa: 'Casa', departamento: 'Departamento', chalet: 'Chalet',
  ph: 'PH', lote: 'Lote / Terreno', local: 'Local Comercial', galpon: 'Galpón',
  campo: 'Campo', oficina: 'Oficina', quinta: 'Quinta', hotel: 'Hotel',
}

const operationLabels: Record<string, string> = {
  venta: 'Venta', alquiler: 'Alquiler', temporario: 'Temporario',
}

export function getMLCategoryId(operation: string, type: string): string {
  return ML_CATEGORIES[operation]?.[type] || 'MLA401686'
}

export function getAuthUrl(appId: string, redirectUri: string): string {
  return `${ML_AUTH_URL}/authorization?response_type=code&client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}`
}

export async function exchangeCodeForToken(code: string, appId: string, appSecret: string, redirectUri: string) {
  const res = await fetch(`${ML_API_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: appId,
      client_secret: appSecret,
      code,
      redirect_uri: redirectUri,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ML token exchange failed: ${err}`)
  }

  return res.json()
}

export async function refreshMLToken(refreshToken: string, appId: string, appSecret: string) {
  const res = await fetch(`${ML_API_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: appId,
      client_secret: appSecret,
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ML token refresh failed: ${err}`)
  }

  return res.json()
}

/**
 * Get ML credentials: first from DB (MLSettings), then fallback to env vars
 */
export async function getMLCredentials(): Promise<{ appId: string; appSecret: string; redirectUri: string } | null> {
  // Try DB first
  try {
    const settings = await prisma.mLSettings.findFirst()
    if (settings?.appId && settings?.appSecret) {
      return {
        appId: settings.appId,
        appSecret: settings.appSecret,
        redirectUri: settings.redirectUri || `${process.env.NEXT_PUBLIC_SITE_URL || 'https://fzacaria.com.ar'}/api/mercadolibre/auth/callback`,
      }
    }
  } catch {}

  // Fallback to env vars
  const appId = process.env.ML_APP_ID
  const appSecret = process.env.ML_APP_SECRET
  if (appId && appSecret) {
    return {
      appId,
      appSecret,
      redirectUri: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://fzacaria.com.ar'}/api/mercadolibre/auth/callback`,
    }
  }

  return null
}

export async function getValidToken(): Promise<string> {
  const creds = await getMLCredentials()
  if (!creds) throw new Error('No hay credenciales de Mercado Libre configuradas.')
  const { appId, appSecret } = creds

  const token = await prisma.mercadoLibreToken.findFirst({
    orderBy: { createdAt: 'desc' },
  })

  if (!token) throw new Error('No hay token de Mercado Libre. Conectá tu cuenta primero.')

  // Check if token is expired (with 5 min buffer)
  const expiresAt = new Date(token.updatedAt.getTime() + token.expiresIn * 1000 - 5 * 60 * 1000)
  if (new Date() > expiresAt) {
    // Try to refresh the token if we have a refreshToken
    if (token.refreshToken) {
      const refreshed = await refreshMLToken(token.refreshToken, appId, appSecret)
      await prisma.mercadoLibreToken.update({
        where: { id: token.id },
        data: {
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token || token.refreshToken,
          expiresIn: refreshed.expires_in,
          scope: refreshed.scope || token.scope,
        },
      })
      return refreshed.access_token
    } else {
      // No refreshToken — must re-authorize
      throw new Error('Token expirado y no hay refresh token. Reconectá tu cuenta de Mercado Libre desde la configuración.')
    }
  }

  return token.accessToken
}

/**
 * Look up ML location IDs for a given location string.
 * Uses pre-mapped IDs for known coastal cities (Bs.As. Costa Atlántica)
 * and falls back to ML API lookup for other locations.
 */

// Pre-mapped location IDs for Bs.As. Costa Atlántica (most common area)
const COSTA_ATLANTICA_STATE_ID = 'TUxBUENPU2ExMmFkMw'
const COSTA_ATLANTICA_STATE_NAME = 'Bs.As. Costa Atlántica'

const COSTA_CITIES: Record<string, { id: string; name: string }> = {
  'pinamar': { id: 'TUxBQ1BJTmM0NmE5', name: 'Pinamar' },
  'cariló': { id: 'TUxBQ0NBUjJmZDQx', name: 'Cariló' },
  'carilo': { id: 'TUxBQ0NBUjJmZDQx', name: 'Cariló' },
  'valeria del mar': { id: 'TUxBQ1ZBTDM4MGFj', name: 'Valeria del Mar' },
  'ostende': { id: 'TUxBQ09TVGYzNTVm', name: 'Ostende' },
  'villa gesell': { id: 'TUxBQ1ZJTGU4OGM3', name: 'Villa Gesell' },
  'mar azul': { id: 'TUxBQ01BUjE5OTI5', name: 'Mar Azul' },
  'mar del plata': { id: 'TUxBQ01BUjU2MGMw', name: 'Mar del Plata' },
  'mardel': { id: 'TUxBQ01BUjU2MGMw', name: 'Mar del Plata' },
  'san bernardo': { id: 'TUxBQ1NBTjI2NGMw', name: 'San Bernardo' },
  'san clemente': { id: 'TUxBQ1NBTmJkMjMw', name: 'San Clemente' },
  'santa teresita': { id: 'TUxBQ1NBTmEzYjlm', name: 'Santa Teresita' },
  'mar de ajo': { id: 'TUxBQ01BUjNmZDhl', name: 'Mar de Ajo' },
  'la lucila del mar': { id: 'TUxBQ0xBWjQ4YTQz', name: 'La Lucila del Mar' },
  'mar del tuyú': { id: 'TUxBQ01BUjYzZWE3', name: 'Mar del Tuyú' },
  'costa azul': { id: 'TUxBQ0NPUzQzNjYyNQ', name: 'Costa Azul' },
  'costa esmeralda': { id: 'TUxBQ0NPU3RhZXNt', name: 'Costa Esmeralda' },
  'mar de las pampas': { id: 'TUxBQ01BUjkyY2Y2', name: 'Mar de las Pampas' },
  'miramar': { id: 'TUxBQ01JUjczYTE4', name: 'Miramar' },
  'necochea': { id: 'TUxBQ05FQ2Q3Y2I3', name: 'Necochea' },
  'santa clara del mar': { id: 'TUxBQ1NBTmYwZTdl', name: 'Santa Clara del Mar' },
  'aguas verdes': { id: 'TUxBQ0FHVWE1Yjkz', name: 'Aguas Verdes' },
  'las toninas': { id: 'TUxBQ0xBUzUxYzJk', name: 'Las Toninas' },
  'chapadmalal': { id: 'TUxBQ0NIQTI5MTkx', name: 'Chapadmalal' },
  'general madariaga': { id: 'TUxBQ0dFTjU2MTY', name: 'General Madariaga' },  // Note: this is under Buenos Aires Interior
}

// Non-coastal cities that belong to Buenos Aires Interior
const INTERIOR_STATE_ID = 'TUxBUFpPTmFpbnRl'
const INTERIOR_STATE_NAME = 'Buenos Aires Interior'
const INTERIOR_CITIES: Record<string, { id: string; name: string }> = {
  'tandil': { id: 'TUxBQ1RBTjUxMTE', name: 'Tandil' },
  'general madariaga': { id: 'TUxBQ0dFTjU2MTY', name: 'General Madariaga' },
  'la plata': { id: 'TUxBQ0xBUDIxODU', name: 'La Plata' },
  'bahía blanca': { id: 'TUxBQ0JBSDUyOTY3Mg', name: 'Bahía Blanca' },
  'bahia blanca': { id: 'TUxBQ0JBSDUyOTY3Mg', name: 'Bahía Blanca' },
}

async function resolveMLLocation(locationStr: string): Promise<{ stateId: string; cityId: string; cityName: string; stateName: string } | null> {
  try {
    const locationLower = locationStr.toLowerCase()

    // 1. Check pre-mapped Costa Atlántica cities first (most common for this inmobiliaria)
    for (const [keyword, cityData] of Object.entries(COSTA_CITIES)) {
      if (locationLower.includes(keyword)) {
        // General Madariaga is under Buenos Aires Interior, not Costa Atlántica
        if (keyword === 'general madariaga') {
          return {
            stateId: INTERIOR_STATE_ID,
            cityId: cityData.id,
            cityName: cityData.name,
            stateName: INTERIOR_STATE_NAME,
          }
        }
        return {
          stateId: COSTA_ATLANTICA_STATE_ID,
          cityId: cityData.id,
          cityName: cityData.name,
          stateName: COSTA_ATLANTICA_STATE_NAME,
        }
      }
    }

    // 2. Check pre-mapped Interior cities
    for (const [keyword, cityData] of Object.entries(INTERIOR_CITIES)) {
      if (locationLower.includes(keyword)) {
        return {
          stateId: INTERIOR_STATE_ID,
          cityId: cityData.id,
          cityName: cityData.name,
          stateName: INTERIOR_STATE_NAME,
        }
      }
    }

    // 3. Try ML API lookup for unknown locations
    const statesRes = await fetch(`${ML_API_BASE}/classified_locations/countries/AR`)
    const statesData = await statesRes.json()
    const states = statesData.states || []

    // Try to find matching state and city by searching all states
    for (const state of states) {
      try {
        const cityRes = await fetch(`${ML_API_BASE}/classified_locations/states/${state.id}`)
        const cityData = await cityRes.json()
        const cities = cityData.cities || []

        for (const city of cities) {
          if (locationLower.includes(city.name.toLowerCase())) {
            return {
              stateId: state.id,
              cityId: city.id,
              cityName: city.name,
              stateName: state.name,
            }
          }
        }
      } catch {
        // Skip states that fail to load
      }
    }

    // 4. Default fallback to Pinamar (Costa Atlántica)
    console.log('[ML resolveMLLocation] No match found, defaulting to Pinamar')
    return {
      stateId: COSTA_ATLANTICA_STATE_ID,
      cityId: COSTA_CITIES['pinamar'].id,
      cityName: 'Pinamar',
      stateName: COSTA_ATLANTICA_STATE_NAME,
    }
  } catch (error: any) {
    console.error('[ML resolveMLLocation] Error:', error.message)
    // Fallback to Pinamar
    return {
      stateId: COSTA_ATLANTICA_STATE_ID,
      cityId: COSTA_CITIES['pinamar'].id,
      cityName: 'Pinamar',
      stateName: COSTA_ATLANTICA_STATE_NAME,
    }
  }
}

export function buildMLItem(property: any): any {
  const categoryId = getMLCategoryId(property.operation, property.type)
  const opLabel = operationLabels[property.operation] || property.operation
  const tpLabel = typeLabels[property.type] || property.type

  // Parse price - extract numeric value
  let price = 0
  let currencyId = 'ARS'
  if (property.price) {
    const priceStr = String(property.price).replace(/\./g, '').replace(/,/g, '')
    if (priceStr.includes('U$S') || priceStr.includes('USD')) {
      currencyId = 'USD'
      const num = priceStr.replace(/[^0-9]/g, '')
      price = parseInt(num) || 0
    } else {
      const num = priceStr.replace(/[^0-9]/g, '')
      price = parseInt(num) || 0
    }
  }

  // Build description with property details (plain text only — no special chars)
  const extras = property.extras ? property.extras.split(',').map((e: string) => e.trim()).filter(Boolean) : []
  let description = `${property.description || ''}\n\n`
  description += `--- DETALLES DE LA PROPIEDAD ---\n`
  description += `Tipo: ${tpLabel}\n`
  description += `Operacion: ${opLabel}\n`
  if (property.bedrooms > 0) description += `Dormitorios: ${property.bedrooms}\n`
  if (property.bathrooms > 0) description += `Banos: ${property.bathrooms}\n`
  if (property.area > 0) description += `Superficie: ${property.area} m2\n`
  if (property.coveredArea) description += `Superficie cubierta: ${property.coveredArea} m2\n`
  description += `Ubicacion: ${property.location}\n`
  if (extras.length > 0) description += `\nAmenities: ${extras.join(', ')}\n`

  // Add temporada pricing info
  if (property.operation === 'temporario' && property.temporadas?.length) {
    description += `\n--- PRECIOS POR TEMPORADA ---\n`
    for (const t of property.temporadas) {
      const startDate = t.startDate instanceof Date ? t.startDate : new Date(t.startDate)
      const endDate = t.endDate instanceof Date ? t.endDate : new Date(t.endDate)
      const pText = t.price ? (t.currency === 'ARS' ? `$${t.price}` : `U$S ${t.price}`) : 'Consultar'
      const avail = t.available ? 'Disponible' : 'Reservado'
      description += `${t.name || 'Temporada'}: ${pText} (${startDate.toLocaleDateString('es-AR')} - ${endDate.toLocaleDateString('es-AR')}) - ${avail}\n`
    }
  }

  description += `\n--- CONTACTO ---\n`
  description += `Inmobiliaria Florencia Zacaria\n`
  description += `Tel: (02255) 612345\n`
  description += `WhatsApp: +54 9 2255 612345\n`
  description += `www.fzacaria.com.ar\n`
  description += `Martillera Matriculada - Pinamar, Buenos Aires\n`

  // Build attributes — ML requires specific format for real estate
  // Required attributes vary by category (lotes need LAND_ACCESS, etc.)
  const attributes: any[] = []
  const isTerrain = ['lote', 'campo'].includes(property.type)

  // OPERATION attribute is FIXED and HIDDEN by ML — set automatically based on category.
  // Do NOT send it manually or ML will reject it with a "dropped by category fixed-value" error.
  // Venta categories → fixed "Venta" (242075)
  // Alquiler categories → fixed "Alquiler" (242073)
  // Temporario categories → fixed "Alquiler temporal" (242074)

  // Total area — ML requires value_name as '52 m²' and value_struct with number + unit
  const mSq = 'm\u00B2'
  const totalArea = property.area > 0 ? property.area : property.coveredArea || 1
  attributes.push({
    id: 'TOTAL_AREA',
    value_name: `${totalArea} ${mSq}`,
    value_struct: { number: totalArea, unit: mSq },
  })

  if (isTerrain) {
    // Terrain-specific required attributes

    // LAND_ACCESS — required for lotes/terrenos
    // Values: Tierra (245049), Arena (245045), Asfalto (245046), Otro (245047), Ripio (245048)
    const landAccessMap: Record<string, string> = {
      tierra: '245049',
      arena: '245045',
      asfalto: '245046',
      otro: '245047',
      ripio: '245048',
    }
    if (property.landAccess && landAccessMap[property.landAccess]) {
      attributes.push({ id: 'LAND_ACCESS', value_id: landAccessMap[property.landAccess] })
    } else {
      attributes.push({ id: 'LAND_ACCESS', value_id: '245047' }) // Otro (default)
    }

    // Covered area is NOT required for terrenos — send if set
    if (property.coveredArea && property.coveredArea > 0) {
      attributes.push({
        id: 'COVERED_AREA',
        value_name: `${property.coveredArea} ${mSq}`,
        value_struct: { number: property.coveredArea, unit: mSq },
      })
    }
  } else {
    // Non-terrain property attributes

    // Rooms (ambientes) — required for depto/PH, useful for all non-terrain
    const rooms = property.rooms > 0 ? property.rooms : (property.bedrooms > 0 ? Math.max(property.bedrooms + 1, 1) : 1)
    attributes.push({ id: 'ROOMS', value_name: String(rooms) })

    // Bedrooms (dormitorios) — required for casa/depto/PH
    attributes.push({ id: 'BEDROOMS', value_name: String(property.bedrooms || 0) })

    // Bathrooms — required for most types
    attributes.push({ id: 'FULL_BATHROOMS', value_name: String(property.bathrooms || 0) })

    // Parking lots — required field
    attributes.push({ id: 'PARKING_LOTS', value_name: String(property.parkingLots || 0) })

    // Covered area — required for departamentos/casas
    const coveredArea = property.coveredArea || property.area || 1
    attributes.push({
      id: 'COVERED_AREA',
      value_name: `${coveredArea} ${mSq}`,
      value_struct: { number: coveredArea, unit: mSq },
    })
  }

  // ── Temporario: GUESTS is required ──────────────────────────────────
  if (property.operation === 'temporario') {
    attributes.push({ id: 'GUESTS', value_name: String(property.guests || 1) })
  }

  // ── Optional ML fields ──────────────────────────────────────────────

  // PROPERTY_AGE (antigüedad en años)
  if (property.propertyAge > 0) {
    attributes.push({
      id: 'PROPERTY_AGE',
      value_name: String(property.propertyAge),
      value_struct: { number: property.propertyAge, unit: 'años' },
    })
  }

  // MAINTENANCE_FEE (expensas) — with currency struct
  if (property.maintenanceFee) {
    const feeNum = parseFloat(String(property.maintenanceFee).replace(/[^0-9.]/g, ''))
    if (feeNum > 0) {
      attributes.push({
        id: 'MAINTENANCE_FEE',
        value_name: `${feeNum} ARS`,
        value_struct: { number: feeNum, unit: 'ARS' },
      })
    }
  }

  // FACING (orientación)
  if (property.facing) {
    const facingMap: Record<string, string> = { norte: 'Norte', sur: 'Sur', este: 'Este', oeste: 'Oeste' }
    attributes.push({ id: 'FACING', value_name: facingMap[property.facing] || property.facing })
  }

  // DISPOSITION (disposición)
  if (property.disposition) {
    const dispMap: Record<string, string> = { frente: 'Frente', contrafrente: 'Contrafrente', interno: 'Interno', lateral: 'Lateral' }
    attributes.push({ id: 'DISPOSITION', value_name: dispMap[property.disposition] || property.disposition })
  }

  // FURNISHED (amoblado)
  if (property.furnished) {
    attributes.push({ id: 'FURNISHED', value_name: 'Sí' })
  }

  // UNIT_FLOOR (piso del depto) — now Int
  if (property.unitFloor && property.unitFloor > 0) {
    attributes.push({ id: 'UNIT_FLOOR', value_name: String(property.unitFloor) })
  }

  // PROPERTY_SUBTYPE (subtipo de propiedad)
  if (property.propertySubtype) {
    const subtypeAttrId = property.type === 'departamento' ? 'APARTMENT_PROPERTY_SUBTYPE' : 'HOUSE_PROPERTY_SUBTYPE'
    attributes.push({ id: subtypeAttrId, value_name: property.propertySubtype })
  }

  // LOT_DISPOSITION (disposición del lote)
  if (property.lotDisposition) {
    attributes.push({ id: 'LOT_DISPOSITION', value_name: property.lotDisposition })
  }

  // PROPERTY_CODE (código de propiedad)
  if (property.propertyCode) {
    attributes.push({ id: 'PROPERTY_CODE', value_name: property.propertyCode })
  }

  // CONTACT_SCHEDULE (horario de contacto)
  if (property.contactSchedule) {
    attributes.push({ id: 'CONTACT_SCHEDULE', value_name: property.contactSchedule })
  }

  // IS_SUITABLE_FOR_PETS (admite mascotas)
  if (property.petsAllowed) {
    attributes.push({ id: 'IS_SUITABLE_FOR_PETS', value_name: 'Sí' })
  }

  // ── New ML fields ──────────────────────────────────────────────────

  // WAREHOUSES (bauleras)
  if (property.warehouses && property.warehouses > 0) {
    attributes.push({ id: 'WAREHOUSES', value_name: String(property.warehouses) })
  }

  // FLOORS (cantidad de pisos)
  if (property.floors && property.floors > 0) {
    attributes.push({ id: 'FLOORS', value_name: String(property.floors) })
  }

  // APARTMENT_NUMBER (número del departamento)
  if (property.apartmentNumber) {
    attributes.push({ id: 'APARTMENT_NUMBER', value_name: property.apartmentNumber })
  }

  // TOWER_NUMBER (número de torre)
  if (property.towerNumber && property.towerNumber > 0) {
    attributes.push({ id: 'TOWER_NUMBER', value_name: String(property.towerNumber) })
  }

  // HOUSE_NUMBER (número de la casa)
  if (property.houseNumber) {
    attributes.push({ id: 'HOUSE_NUMBER', value_name: property.houseNumber })
  }

  // APARTMENTS_PER_FLOOR (deptos por piso)
  if (property.apartmentsPerFloor && property.apartmentsPerFloor > 0) {
    attributes.push({ id: 'APARTMENTS_PER_FLOOR', value_name: String(property.apartmentsPerFloor) })
  }

  // LOT_DEPTH (metros de fondo)
  if (property.lotDepth && property.lotDepth > 0) {
    attributes.push({
      id: 'LOT_DEPTH',
      value_name: `${property.lotDepth} m`,
      value_struct: { number: property.lotDepth, unit: 'm' },
    })
  }

  // LOT_WIDTH (metros de frente)
  if (property.lotWidth && property.lotWidth > 0) {
    attributes.push({
      id: 'LOT_WIDTH',
      value_name: `${property.lotWidth} m`,
      value_struct: { number: property.lotWidth, unit: 'm' },
    })
  }

  // LOT_SHAPE (forma del terreno)
  if (property.lotShape) {
    attributes.push({ id: 'LOT_SHAPE', value_name: property.lotShape })
  }

  // SECURITY_TYPE (tipo de seguridad)
  if (property.securityType) {
    attributes.push({ id: 'SECURITY_TYPE', value_name: property.securityType })
  }

  // MINIMUM_STAY (estadía mínima en noches) — temporario
  if (property.operation === 'temporario' && property.minimumStay && property.minimumStay > 0) {
    attributes.push({ id: 'MINIMUM_STAY', value_name: String(property.minimumStay) })
  }

  // BEDS (camas) — temporario
  if (property.operation === 'temporario' && property.beds && property.beds > 0) {
    attributes.push({ id: 'BEDS', value_name: String(property.beds) })
  }

  // AVAILABLE (disponible desde) — alquiler
  if (property.operation === 'alquiler' && property.availableFrom) {
    attributes.push({ id: 'AVAILABLE', value_name: property.availableFrom })
  }

  // CHECK_IN (horario check in) — temporario, format "HH:00"
  if (property.operation === 'temporario' && property.checkIn) {
    attributes.push({ id: 'CHECK_IN', value_name: property.checkIn })
  }

  // CHECK_OUT (horario check out) — temporario, format "HH:00"
  if (property.operation === 'temporario' && property.checkOut) {
    attributes.push({ id: 'CHECK_OUT', value_name: property.checkOut })
  }

  // INSCRIPTION_NUMBER (nro registro establecimiento) — temporario
  if (property.operation === 'temporario' && property.inscriptionNumber) {
    attributes.push({ id: 'INSCRIPTION_NUMBER', value_name: property.inscriptionNumber })
  }

  // OFFICES (número de oficinas)
  if (property.offices && property.offices > 0) {
    attributes.push({ id: 'OFFICES', value_name: String(property.offices) })
  }

  // OFFICES_PER_FLOOR (oficinas por piso)
  if (property.officesPerFloor && property.officesPerFloor > 0) {
    attributes.push({ id: 'OFFICES_PER_FLOOR', value_name: String(property.officesPerFloor) })
  }

  // WHEELCHAIR_RAMP (rampa silla de ruedas)
  if (property.wheelchairRamp) {
    attributes.push({ id: 'WHEELCHAIR_RAMP', value_name: 'Sí' })
  }

  // SUITABLE_FOR_MORTGAGE_LOAN (apto crédito) — only venta
  if (property.operation === 'venta' && property.suitableForMortgage) {
    attributes.push({ id: 'SUITABLE_FOR_MORTGAGE_LOAN', value_name: 'Sí' })
  }

  // PROFESSIONAL_USE_ALLOWED (apto profesional)
  if (property.professionalUse) {
    attributes.push({ id: 'PROFESSIONAL_USE_ALLOWED', value_name: 'Sí' })
  }

  // CHILDREN_WELCOME (apto familias con niños) — temporario
  if (property.operation === 'temporario' && property.childrenWelcome) {
    attributes.push({ id: 'CHILDREN_WELCOME', value_name: 'Sí' })
  }

  // ONLY_FAMILIES (solo familias) — temporario
  if (property.operation === 'temporario' && property.onlyFamilies) {
    attributes.push({ id: 'ONLY_FAMILIES', value_name: 'Sí' })
  }

  // MONTHLY_RENT_FACTOR (factor multiplicador de renta) — casas alquiler
  if (property.operation === 'alquiler' && property.monthlyRentFactor) {
    attributes.push({ id: 'MONTHLY_RENT_FACTOR', value_name: property.monthlyRentFactor })
  }

  // ── Parse mlAmenities JSON and add all true ones ────────────────────
  if (property.mlAmenities) {
    try {
      const amenities = JSON.parse(property.mlAmenities)
      for (const [key, value] of Object.entries(amenities)) {
        if (value === true) {
          attributes.push({ id: key, value_name: 'Sí' })
        }
      }
    } catch {}
  }

  // Build images array (ML accepts URLs)
  // Convert relative paths to absolute URLs so ML can fetch them
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fzacaria.com.ar'

  function toAbsoluteUrl(imgPath: string): string | null {
    if (!imgPath) return null
    // Already absolute URL
    if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) return imgPath
    // Data URI (base64) — ML doesn't accept these, skip
    if (imgPath.startsWith('data:')) return null
    // Relative path: /uploads/xxx or just filename
    if (imgPath.startsWith('/')) return `${siteUrl}${imgPath}`
    // Bare filename (legacy)
    return `${siteUrl}/uploads/${imgPath}`
  }

  const pictures: { source: string }[] = []
  const mainImageUrl = toAbsoluteUrl(property.image)
  if (mainImageUrl) {
    pictures.push({ source: mainImageUrl })
  }
  // Parse additional images
  if (property.images) {
    try {
      const parsed = JSON.parse(property.images)
      if (Array.isArray(parsed)) {
        parsed.forEach((img: string) => {
          const absUrl = toAbsoluteUrl(img)
          if (absUrl && absUrl !== mainImageUrl) {
            pictures.push({ source: absUrl })
          }
        })
      }
    } catch {
      property.images.split(',').map((img: string) => img.trim()).forEach((img: string) => {
        const absUrl = toAbsoluteUrl(img)
        if (absUrl && absUrl !== mainImageUrl) {
          pictures.push({ source: absUrl })
        }
      })
    }
  }

  // Clean title — ML has a 60-char limit for real estate classifieds
  const rawTitle = `${opLabel} - ${tpLabel} en ${property.location}`
  const title = rawTitle.length > 60 ? rawTitle.substring(0, 57) + '...' : rawTitle

  const item: any = {
    title,
    category_id: categoryId,
    price: price || 1, // ML requires a price, minimum 1
    currency_id: currencyId,
    available_quantity: 1,
    condition: 'not_specified',
    listing_type_id: ML_LISTING_TYPES[property.operation] || 'free',
    description: { plain_text: description.substring(0, 50000) }, // ML limit
    pictures,
    attributes,
  }

  // For temporario without general price, use temporada first price
  if (property.operation === 'temporario' && !price && property.temporadas?.length) {
    const firstTemp = property.temporadas.find((t: any) => t.price)
    if (firstTemp) {
      const tempPrice = parseInt(String(firstTemp.price).replace(/[^0-9]/g, '')) || 1
      item.price = tempPrice
      item.currency_id = firstTemp.currency === 'ARS' ? 'ARS' : 'USD'
    }
  }

  return item
}

/**
 * Build the location object for an ML item (async because it queries ML API)
 * Also resolves the correct listing_type_id dynamically
 */
export async function buildMLItemWithLocation(property: any, accessToken: string): Promise<any> {
  const item = buildMLItem(property)

  // Resolve the best available listing type for this category
  const listingType = await getAvailableListingType(accessToken, item.category_id)
  item.listing_type_id = listingType
  console.log(`[ML buildMLItemWithLocation] Using listing_type_id: ${listingType} for category: ${item.category_id}`)

  // Resolve location from property.location string
  const loc = await resolveMLLocation(property.location)
  if (loc) {
    item.location = {
      address: property.location,
      city: {
        id: loc.cityId,
        name: loc.cityName,
      },
      state: {
        id: loc.stateId,
        name: loc.stateName,
      },
      country_id: 'AR',
    }
  }

  return item
}

export async function publishToML(accessToken: string, item: any) {
  console.log('[ML publishToML] Sending item:', JSON.stringify(item, null, 2))

  const res = await fetch(`${ML_API_BASE}/items`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(item),
  })

  const data = await res.json()
  console.log('[ML publishToML] Response status:', res.status, 'data:', JSON.stringify(data))

  if (!res.ok) {
    // Build a detailed error message from ML's response
    let errMsg = ''
    if (data.cause && Array.isArray(data.cause) && data.cause.length > 0) {
      errMsg = data.cause.map((c: any) => {
        if (c.type === 'error' && c.message) return c.message
        if (c.code) return `${c.code}: ${c.message || c.description || ''}`
        return JSON.stringify(c)
      }).join('; ')
    }
    if (!errMsg && data.message) errMsg = data.message
    if (!errMsg && data.error) errMsg = data.error
    if (!errMsg) errMsg = JSON.stringify(data)

    throw new Error(`ML error: ${errMsg}`)
  }

  return data
}

export async function getMLItemStatus(accessToken: string, itemId: string) {
  const res = await fetch(`${ML_API_BASE}/items/${itemId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  })

  if (!res.ok) throw new Error(`Failed to get ML item status`)
  return res.json()
}

/**
 * Update an existing ML item's description, attributes, price, pictures, etc.
 * ML API: PUT /items/{id} to update the item itself
 *         PUT /items/{id}/description to update the description separately
 * Note: ML requires description updates via a separate endpoint.
 */
export async function updateMLItem(accessToken: string, mlItemId: string, property: any) {
  // Build the full item payload (we'll extract what we need from it)
  const item = buildMLItem(property)

  // 1. Update the item itself (title, price, attributes, pictures, etc.)
  // ML allows PUT on /items/{id} for most fields, but NOT description
  const itemPayload: any = {
    title: item.title,
    price: item.price,
    currency_id: item.currency_id,
    attributes: item.attributes,
    pictures: item.pictures,
  }

  console.log(`[ML updateMLItem] Updating item ${mlItemId}`)
  console.log(`[ML updateMLItem] Item payload:`, JSON.stringify(itemPayload, null, 2))

  const itemRes = await fetch(`${ML_API_BASE}/items/${mlItemId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(itemPayload),
  })

  const itemData = await itemRes.json()
  console.log(`[ML updateMLItem] Item update response:`, itemRes.status, JSON.stringify(itemData))

  if (!itemRes.ok) {
    // Build detailed error
    let errMsg = ''
    if (itemData.cause && Array.isArray(itemData.cause) && itemData.cause.length > 0) {
      errMsg = itemData.cause.map((c: any) => {
        if (c.type === 'error' && c.message) return c.message
        if (c.code) return `${c.code}: ${c.message || c.description || ''}`
        return JSON.stringify(c)
      }).join('; ')
    }
    if (!errMsg && itemData.message) errMsg = itemData.message
    if (!errMsg && itemData.error) errMsg = itemData.error
    if (!errMsg) errMsg = JSON.stringify(itemData)

    throw new Error(`Error al actualizar en ML: ${errMsg}`)
  }

  // 2. Update the description separately (ML requires this endpoint for description)
  const descPayload = item.description // { plain_text: "..." }
  console.log(`[ML updateMLItem] Updating description for ${mlItemId}`)

  const descRes = await fetch(`${ML_API_BASE}/items/${mlItemId}/description`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(descPayload),
  })

  const descData = await descRes.json()
  console.log(`[ML updateMLItem] Description update response:`, descRes.status, JSON.stringify(descData))

  if (!descRes.ok) {
    // Description update failed, but item was updated - log warning but don't fail
    console.warn(`[ML updateMLItem] Description update failed: ${JSON.stringify(descData)}`)
    // Return the item data anyway, but include a warning
    return { ...itemData, _descUpdateWarning: true, _descUpdateError: descData }
  }

  return itemData
}
