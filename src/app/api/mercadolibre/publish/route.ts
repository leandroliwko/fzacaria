import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthStatus } from '@/lib/auth'
import { getValidToken, buildMLItemWithLocation, publishToML, updateMLItem } from '@/lib/mercadolibre'

// Listing types to try in order when quota errors occur
const LISTING_TYPE_FALLBACKS = ['free', 'silver', 'gold', 'gold_special', 'gold_pro']

// POST - Publish a property to Mercado Libre
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { propertyId } = await request.json()
    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId es requerido' }, { status: 400 })
    }

    // Check if already published (only block if it's actually active with an ML ID)
    const existing = await prisma.mercadoLibreListing.findUnique({
      where: { propertyId },
    })
    if (existing && existing.status === 'active' && existing.mlItemId) {
      return NextResponse.json({
        error: 'Esta propiedad ya está publicada en Mercado Libre',
        mlItemId: existing.mlItemId,
        mlPermalink: existing.mlPermalink,
      }, { status: 400 })
    }
    // If there's an error record from a previous attempt, delete it so we can retry
    if (existing && (existing.status === 'error' || !existing.mlItemId)) {
      await prisma.mercadoLibreListing.delete({ where: { propertyId } })
    }

    // Get property with temporadas
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { temporadas: { orderBy: [{ order: 'asc' }, { startDate: 'asc' }] } },
    })

    if (!property || !property.active) {
      return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 })
    }

    // Get valid ML token
    let accessToken: string
    try {
      accessToken = await getValidToken()
      console.log('[ML Publish] Got valid access token for property:', propertyId)
    } catch (error: any) {
      console.error('[ML Publish] Token error:', error.message)
      return NextResponse.json({
        error: 'Token de Mercado Libre no disponible. Conectá tu cuenta primero.',
        details: error.message,
        needsAuth: true,
      }, { status: 401 })
    }

    // Build and publish item (with location + dynamic listing type)
    const item = await buildMLItemWithLocation(property, accessToken)
    console.log('[ML Publish] Publishing item:', JSON.stringify({ title: item.title, category_id: item.category_id, listing_type_id: item.listing_type_id, price: item.price, currency_id: item.currency_id, location: item.location }))
    
    let result: any
    let lastError: any = null

    // Try publishing with the resolved listing type first
    // If quota error, try each fallback listing type
    const typesToTry = [item.listing_type_id, ...LISTING_TYPE_FALLBACKS.filter(t => t !== item.listing_type_id)]
    const triedTypes = new Set<string>()

    for (const listingType of typesToTry) {
      if (triedTypes.has(listingType)) continue
      triedTypes.add(listingType)

      item.listing_type_id = listingType
      console.log(`[ML Publish] Trying listing_type_id: ${listingType}`)

      try {
        result = await publishToML(accessToken, item)
        console.log('[ML Publish] ML API response:', JSON.stringify({ id: result.id, status: result.status, permalink: result.permalink }))
        break // Success!
      } catch (error: any) {
        lastError = error
        console.error(`[ML Publish] Error with ${listingType}:`, error.message)

        // Only retry with different listing type if it's a quota error
        const isQuotaError = error.message?.includes('Not available quota') || error.message?.includes('quota')
        if (!isQuotaError) {
          // Not a quota error — don't retry with different listing type
          break
        }

        console.log(`[ML Publish] Quota error with ${listingType}, trying next type...`)
      }
    }

    if (!result && lastError) {
      console.error('[ML Publish] All listing types failed:', lastError.message)
      // Save error to listing
      try {
        await prisma.mercadoLibreListing.upsert({
          where: { propertyId },
          create: {
            propertyId,
            status: 'error',
            errorMessage: lastError.message?.substring(0, 500) || 'Error desconocido',
          },
          update: {
            status: 'error',
            errorMessage: lastError.message?.substring(0, 500) || 'Error desconocido',
          },
        })
      } catch {}
      
      return NextResponse.json({
        error: 'Error al publicar en Mercado Libre',
        details: lastError.message,
        quotaError: lastError.message?.includes('Not available quota') || lastError.message?.includes('quota'),
      }, { status: 500 })
    }

    // Save listing to database
    const listing = await prisma.mercadoLibreListing.upsert({
      where: { propertyId },
      create: {
        propertyId,
        mlItemId: result.id || '',
        mlPermalink: result.permalink || '',
        status: result.status || 'pending',
        lastSynced: new Date(),
      },
      update: {
        mlItemId: result.id || '',
        mlPermalink: result.permalink || '',
        status: result.status || 'pending',
        lastSynced: new Date(),
        errorMessage: '',
      },
    })

    return NextResponse.json({
      success: true,
      mlItemId: result.id,
      mlPermalink: result.permalink,
      status: result.status,
      listing,
    })
  } catch (error: any) {
    console.error('ML publish error:', error)

    // Save error to listing if we have a propertyId
    try {
      const body = await request.clone().json().catch(() => ({}))
      if (body.propertyId) {
        await prisma.mercadoLibreListing.upsert({
          where: { propertyId: body.propertyId },
          create: {
            propertyId: body.propertyId,
            status: 'error',
            errorMessage: error.message?.substring(0, 500) || 'Error desconocido',
          },
          update: {
            status: 'error',
            errorMessage: error.message?.substring(0, 500) || 'Error desconocido',
          },
        })
      }
    } catch {}

    return NextResponse.json({
      error: 'Error al publicar en Mercado Libre',
      details: error.message,
    }, { status: 500 })
  }
}

// PUT - Update an existing ML listing with current property data (description, attributes, price, pictures)
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { propertyId } = await request.json()
    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId es requerido' }, { status: 400 })
    }

    // Find existing listing
    const listing = await prisma.mercadoLibreListing.findUnique({
      where: { propertyId },
    })

    if (!listing || !listing.mlItemId) {
      return NextResponse.json({ error: 'Esta propiedad no está publicada en Mercado Libre' }, { status: 404 })
    }

    if (listing.status === 'closed') {
      return NextResponse.json({ error: 'La publicación está cerrada. Eliminá la publicación y volvé a publicar.' }, { status: 400 })
    }

    // Get property with temporadas
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { temporadas: { orderBy: [{ order: 'asc' }, { startDate: 'asc' }] } },
    })

    if (!property) {
      return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 })
    }

    // Get valid ML token
    let accessToken: string
    try {
      accessToken = await getValidToken()
      console.log('[ML Update] Got valid access token for property:', propertyId)
    } catch (error: any) {
      console.error('[ML Update] Token error:', error.message)
      return NextResponse.json({
        error: 'Token de Mercado Libre no disponible. Conectá tu cuenta primero.',
        details: error.message,
        needsAuth: true,
      }, { status: 401 })
    }

    // Update the item on ML
    const result = await updateMLItem(accessToken, listing.mlItemId, property)

    // Update the listing record
    const descWarning = (result as any)._descUpdateWarning
    await prisma.mercadoLibreListing.update({
      where: { propertyId },
      data: {
        status: result.status || listing.status,
        mlPermalink: result.permalink || listing.mlPermalink,
        lastSynced: new Date(),
        errorMessage: descWarning ? 'Descripción: error al actualizar (el resto se actualizó OK)' : '',
      },
    })

    return NextResponse.json({
      success: true,
      mlItemId: listing.mlItemId,
      mlPermalink: result.permalink || listing.mlPermalink,
      status: result.status,
      descWarning: !!descWarning,
    })
  } catch (error: any) {
    console.error('[ML Update] Error:', error)
    return NextResponse.json({
      error: 'Error al actualizar en Mercado Libre',
      details: error.message,
    }, { status: 500 })
  }
}

// DELETE - Unpublish/remove listing from ML
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { propertyId } = await request.json()
    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId es requerido' }, { status: 400 })
    }

    const listing = await prisma.mercadoLibreListing.findUnique({
      where: { propertyId },
    })

    if (!listing || !listing.mlItemId) {
      return NextResponse.json({ error: 'No hay publicación de ML para esta propiedad' }, { status: 404 })
    }

    // Close the listing on ML
    const accessToken = await getValidToken()
    const res = await fetch(`https://api.mercadolibre.com/items/${listing.mlItemId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'closed' }),
    })

    // Delete the listing record
    await prisma.mercadoLibreListing.delete({
      where: { propertyId },
    })

    return NextResponse.json({ success: true, message: 'Publicación eliminada de Mercado Libre' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
