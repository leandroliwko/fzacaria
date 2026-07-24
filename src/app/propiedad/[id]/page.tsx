import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import PropertyPageClient from './PropertyPageClient'

const SITE_URL = 'https://fzacaria.com.ar'

const typeLabels: Record<string, string> = {
  casa: 'Casa',
  departamento: 'Departamento',
  chalet: 'Chalet',
  ph: 'PH',
  lote: 'Lote / Terreno',
  local: 'Local Comercial',
  campo: 'Campo',
  oficina: 'Oficina',
  quinta: 'Quinta',
  hotel: 'Hotel',
}

const operationLabel: Record<string, string> = {
  venta: 'Venta',
  alquiler: 'Alquiler',
  temporario: 'Temporario',
}

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Resolve a property image field into a publicly accessible URL.
 * Handles: Vercel Blob URLs, relative paths, data: URIs (skipped).
 */
function resolveOgImageUrl(imageValue: string | null | undefined, imagesValue: string | null | undefined): string {
  // Try the main image field first
  if (imageValue) {
    // Skip data: URIs — Facebook's crawler cannot fetch them
    if (imageValue.startsWith('data:')) {
      // Fall through to images array
    } else if (imageValue.startsWith('http')) {
      return imageValue
    } else {
      // Relative path → make absolute
      return `${SITE_URL}/uploads/${imageValue}`
    }
  }

  // Try the images array (comma-separated URLs)
  if (imagesValue) {
    const imageList = String(imagesValue).split(',').map((s: string) => s.trim()).filter(Boolean)
    for (const img of imageList) {
      // Skip data: URIs
      if (img.startsWith('data:')) continue
      if (img.startsWith('http')) return img
      return `${SITE_URL}/uploads/${img}`
    }
  }

  // Default fallback
  return `${SITE_URL}/og-default.jpg`
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { id } = await params
    const property = await prisma.property.findUnique({
      where: { id },
      include: { temporadas: { orderBy: [{ order: 'asc' }, { startDate: 'asc' }] } },
    })

    if (!property || !property.active) {
      return {
        title: 'Propiedad no encontrada | Inmobiliaria Florencia Zacaria',
      }
    }

    const tpLabel = typeLabels[property.type] || property.type
    const opLabel = operationLabel[property.operation] || property.operation

    // Build rich description with all property details
    const parts: string[] = []
    parts.push(`${opLabel} - ${tpLabel} en ${property.location}.`)
    if (property.bedrooms > 0) parts.push(`${property.bedrooms} dormitorios`)
    if (property.bathrooms > 0) parts.push(`${property.bathrooms} banos`)
    if (property.area > 0) parts.push(`${property.area.toLocaleString()} m2`)
    if (property.coveredArea) parts.push(`${property.coveredArea.toLocaleString()} m2 cubiertos`)

    // Add amenities (first 8)
    const extras = property.extras
      ? String(property.extras).split(',').map(e => e.trim()).filter(Boolean).slice(0, 8)
      : []
    if (extras.length > 0) parts.push(`Amenities: ${extras.join(', ')}`)

    // For temporal properties: include ALL seasons info
    if (property.operation === 'temporario' && property.temporadas?.length) {
      const seasonNames = property.temporadas
        .filter((t: any) => t.available !== false)
        .map((t: any) => t.name)
        .filter(Boolean)
      if (seasonNames.length > 0) {
        parts.push(`Temporadas disponibles: ${seasonNames.join(', ')}`)
      }
      // Price range
      const prices = property.temporadas
        .filter((t: any) => t.price && t.available !== false)
        .map((t: any) => {
          const p = String(t.price).replace(/[^0-9.]/g, '')
          return p ? parseFloat(p) : 0
        })
        .filter((p: number) => p > 0)
      if (prices.length > 0) {
        const minPrice = Math.min(...prices)
        const maxPrice = Math.max(...prices)
        const firstTemp = property.temporadas.find((t: any) => t.price && t.available !== false)
        const curr = firstTemp?.currency === 'ARS' ? '$' : 'U$S'
        if (minPrice === maxPrice) {
          parts.push(`Precio: ${curr} ${minPrice.toLocaleString()} por temporada`)
        } else {
          parts.push(`Desde ${curr} ${minPrice.toLocaleString()} hasta ${curr} ${maxPrice.toLocaleString()} por temporada`)
        }
      }
    } else if (property.price && String(property.price).trim()) {
      parts.push(`Precio: ${property.price}`)
    }

    // Add property description (truncated)
    if (property.description) {
      const descShort = property.description.length > 150
        ? property.description.substring(0, 147) + '...'
        : property.description
      parts.push(descShort)
    }

    parts.push('Inmobiliaria Florencia Zacaria - Pinamar')

    const description = parts.join('. ') + '.'

    // Title with key info
    const titleParts = [property.title]
    if (property.operation === 'temporario') {
      titleParts.push('Alquiler Temporario')
    }
    if (property.bedrooms > 0) titleParts.push(`${property.bedrooms} dorm.`)
    if (property.area > 0) titleParts.push(`${property.area.toLocaleString()} m2`)
    const title = titleParts.join(' - ')

    // ── OG Image Strategy ──
    // PRIMARY: Use the dynamic OG image route which generates a branded 1200x630 image
    // with property photo, price, details, and season info.
    // This is the most reliable option for Facebook/Twitter because:
    // 1. It always returns a properly sized image (1200x630)
    // 2. It's served from our own domain (no CORS issues)
    // 3. It includes branding and key info even if the property image fails to load
    // 4. It handles data: URIs and missing images gracefully
    const dynamicOgImageUrl = `${SITE_URL}/api/property/og?id=${property.id}`

    // FALLBACK: Direct property image URL (for Twitter and as secondary)
    const directImageUrl = resolveOgImageUrl(property.image, property.images)

    const propertyUrl = `${SITE_URL}/propiedad/${property.id}`

    // Build og:image array: dynamic OG route is always first (most reliable)
    // Only add direct property image if it's a valid HTTP URL (not data: URI, not a broken blob)
    const ogImages: { url: string; width: number; height: number; alt: string; secureUrl?: string }[] = [
      {
        url: dynamicOgImageUrl,
        width: 1200,
        height: 630,
        alt: property.title,
        secureUrl: dynamicOgImageUrl,
      },
    ]

    // Add direct property image ONLY if it's a valid external URL
    // Skip data: URIs, relative paths, and blob URLs that might be 404
    if (directImageUrl && directImageUrl.startsWith('https://') && !directImageUrl.includes('blob.vercel-storage.com')) {
      ogImages.push({
        url: directImageUrl,
        width: 1200,
        height: 630,
        alt: property.title,
        secureUrl: directImageUrl,
      })
    }

    return {
      title: `${property.title} | Inmobiliaria Florencia Zacaria`,
      description,
      openGraph: {
        title,
        description,
        url: propertyUrl,
        siteName: 'Inmobiliaria Florencia Zacaria',
        images: ogImages,
        locale: 'es_AR',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: ogImages.map(img => img.url),
      },
      alternates: {
        canonical: propertyUrl,
      },
    }
  } catch {
    return {
      title: 'Propiedad | Inmobiliaria Florencia Zacaria',
    }
  }
}

export default async function PropiedadPage({ params }: PageProps) {
  const { id } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let property: any = null
  try {
    property = await prisma.property.findUnique({
      where: { id },
      include: { temporadas: { orderBy: [{ order: 'asc' }, { startDate: 'asc' }] } },
    })
  } catch {
    // Will be handled in client component
  }

  if (!property || !property.active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-navy mb-2">Propiedad no encontrada</h1>
          <p className="text-navy-light mb-4">La propiedad que buscas no existe o fue dada de baja.</p>
          <a href="/" className="text-gold hover:text-gold-dark font-medium">
            Volver al inicio
          </a>
        </div>
      </div>
    )
  }

  // Serialize dates for client component
  const serializedProperty: any = {
    ...property,
    tempStart: property.tempStart?.toISOString() || null,
    tempEnd: property.tempEnd?.toISOString() || null,
    createdAt: property.createdAt.toISOString(),
    updatedAt: property.updatedAt.toISOString(),
    temporadas: property.temporadas?.map((t: any) => ({
      id: t.id,
      name: t.name,
      startDate: t.startDate?.toISOString().split('T')[0] || '',
      endDate: t.endDate?.toISOString().split('T')[0] || '',
      price: t.price || '',
      currency: t.currency || 'USD',
      available: t.available !== false,
    })) || [],
  }

  // ── JSON-LD Structured Data for SEO ──
  const opLabel = operationLabel[property.operation] || property.operation
  const tpLabel = typeLabels[property.type] || property.type
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: property.title,
    description: property.description || undefined,
    url: `${SITE_URL}/propiedad/${property.id}`,
    image: resolveOgImageUrl(property.image, property.images),
    datePosted: property.createdAt?.toISOString(),
    address: {
      '@type': 'PostalAddress',
      addressLocality: property.location,
      addressRegion: 'Buenos Aires',
      addressCountry: 'AR',
    },
    ...(property.price && String(property.price).trim() ? {
      offers: {
        '@type': 'Offer',
        price: String(property.price).replace(/[^0-9.]/g, '') || undefined,
        priceCurrency: String(property.price).includes('$') && !String(property.price).includes('U$S') ? 'ARS' : 'USD',
      },
    } : {}),
    ...(property.area > 0 ? { floorSize: { '@type': 'QuantitativeValue', value: property.area, unitCode: 'MTK' } } : {}),
    numberOfRooms: property.bedrooms > 0 ? property.bedrooms : undefined,
    numberOfBathroomsTotal: property.bathrooms > 0 ? property.bathrooms : undefined,
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'operation', value: opLabel },
      { '@type': 'PropertyValue', name: 'propertyType', value: tpLabel },
    ].filter((p: any) => p.value !== undefined),
    seller: {
      '@type': 'RealEstateAgent',
      name: 'Inmobiliaria Florencia Zacaria',
      url: SITE_URL,
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Pinamar',
        addressRegion: 'Buenos Aires',
        addressCountry: 'AR',
      },
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PropertyPageClient property={serializedProperty} />
    </>
  )
}
