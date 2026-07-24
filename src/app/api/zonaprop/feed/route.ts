import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Generate XML feed for ZonaProp integration
// This endpoint outputs all properties marked for ZonaProp as an XML feed
// that ZonaProp can consume to sync listings automatically
export async function GET(request: NextRequest) {
  try {
    // Get all properties marked for ZonaProp with active status
    const zpListings = await prisma.zonaPropListing.findMany({
      where: { zpStatus: 'active' },
      include: {
        property: {
          include: {
            temporadas: {
              orderBy: [{ order: 'asc' }, { startDate: 'asc' }],
            },
          },
        },
      },
    })

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fzacaria.com.ar'
    const now = new Date().toISOString()

    // Type mapping for ZonaProp
    const zpTypeMap: Record<string, string> = {
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

    const zpOperationMap: Record<string, string> = {
      venta: 'Venta',
      alquiler: 'Alquiler',
      temporario: 'Alquiler temporal',
    }

    // Parse price from string
    function parsePrice(priceStr: string): { amount: number; currency: string } {
      if (!priceStr) return { amount: 0, currency: 'ARS' }
      const cleaned = String(priceStr).replace(/\./g, '').replace(/,/g, '')
      if (cleaned.includes('U$S') || cleaned.includes('USD')) {
        const num = parseInt(cleaned.replace(/[^0-9]/g, '')) || 0
        return { amount: num, currency: 'USD' }
      }
      const num = parseInt(cleaned.replace(/[^0-9]/g, '')) || 0
      return { amount: num, currency: 'ARS' }
    }

    // Get property images as URLs
    function getPropertyImages(property: any): string[] {
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
      return images
    }

    // Escape XML special characters
    function xmlEscape(str: string): string {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
    }

    // Build XML listings
    const xmlListings = zpListings.map((zp) => {
      const p = zp.property
      if (!p || !p.active) return ''

      const { amount, currency } = parsePrice(p.price)
      const images = getPropertyImages(p)
      const extras = p.extras ? p.extras.split(',').map((e: string) => e.trim()).filter(Boolean) : []
      const features = p.features ? p.features.split(',').map((f: string) => f.trim()).filter(Boolean) : []

      // Build description
      let description = p.description || ''
      if (p.operation === 'temporario' && p.temporadas?.length) {
        description += '\n\nPrecios por temporada:\n'
        for (const t of p.temporadas) {
          const pText = t.price ? (t.currency === 'ARS' ? `$${t.price}` : `U$S ${t.price}`) : 'Consultar'
          const avail = t.available ? 'Disponible' : 'Reservado'
          const start = t.startDate ? new Date(t.startDate).toLocaleDateString('es-AR') : ''
          const end = t.endDate ? new Date(t.endDate).toLocaleDateString('es-AR') : ''
          description += `- ${t.name || 'Temporada'}: ${pText} (${start} - ${end}) ${avail}\n`
        }
      }
      description += '\n\nInmobiliaria Florencia Zacaría\nTel: (02255) 612345\nwww.fzacaria.com.ar'

      const imagesXml = images.map((img, i) => `      <imagen>${xmlEscape(img)}</imagen>`).join('\n')
      const extrasXml = extras.map((e) => `      <extra>${xmlEscape(e)}</extra>`).join('\n')

      // Temporada pricing
      let temporadaXml = ''
      if (p.operation === 'temporario' && p.temporadas?.length) {
        const tempPrices = p.temporadas.filter((t: any) => t.price).map((t: any) => {
          const tPrice = parseInt(String(t.price).replace(/[^0-9]/g, '')) || 0
          const tCurrency = t.currency === 'ARS' ? 'ARS' : 'USD'
          return `        <temporada>
          <nombre>${xmlEscape(t.name || 'Temporada')}</nombre>
          <inicio>${t.startDate ? new Date(t.startDate).toISOString().split('T')[0] : ''}</inicio>
          <fin>${t.endDate ? new Date(t.endDate).toISOString().split('T')[0] : ''}</fin>
          <precio>${tPrice}</precio>
          <moneda>${tCurrency}</moneda>
          <disponible>${t.available ? 'true' : 'false'}</disponible>
        </temporada>`
        }).join('\n')
        temporadaXml = `      <temporadas>\n${tempPrices}\n      </temporadas>`
      }

      return `    <propiedad>
      <id>${xmlEscape(p.id)}</id>
      <codigo>${xmlEscape(p.code)}</codigo>
      <titulo>${xmlEscape(p.title)}</titulo>
      <tipo>${xmlEscape(zpTypeMap[p.type] || p.type)}</tipo>
      <operacion>${xmlEscape(zpOperationMap[p.operation] || p.operation)}</operacion>
      <precio>${amount}</precio>
      <moneda>${currency}</moneda>
      <ubicacion>${xmlEscape(p.location)}</ubicacion>
      <latitud>${p.latitude}</latitud>
      <longitud>${p.longitude}</longitud>
      <dormitorios>${p.bedrooms}</dormitorios>
      <banos>${p.bathrooms}</banos>
      <superficieTotal>${p.area}</superficieTotal>
      <superficieCubierta>${p.coveredArea || 0}</superficieCubierta>
      <descripcion>${xmlEscape(description)}</descripcion>
      <url>${xmlEscape(`${siteUrl}/propiedad/${p.id}`)}</url>
      <imagenes>
${imagesXml}
      </imagenes>
      <amenities>
${extrasXml}
      </amenities>
      <destacada>${p.featured ? 'true' : 'false'}</destacada>
${temporadaXml}
    </propiedad>`
    }).filter(Boolean).join('\n')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<propiedades xmlns="https://fzacaria.com.ar/zonaprop-feed" generado="${now}" total="${zpListings.length}">
  <inmobiliaria>
    <nombre>Inmobiliaria Florencia Zacaría</nombre>
    <telefono>(02255) 612345</telefono>
    <email>info@fzacaria.com.ar</email>
    <web>${xmlEscape(siteUrl)}</web>
    <matricula>Martillera Matriculada - Pinamar, Buenos Aires</matricula>
  </inmobiliaria>
  <listados>
${xmlListings}
  </listados>
</propiedades>`

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=1800, s-maxage=1800',
      },
    })
  } catch (error: any) {
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><error>${xmlEscape(error.message)}</error>`, {
      status: 500,
      headers: { 'Content-Type': 'application/xml' },
    })
  }
}

function xmlEscape(str: string): string {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
