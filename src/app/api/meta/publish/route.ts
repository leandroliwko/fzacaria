import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthStatus } from '@/lib/auth'
import {
  getValidPageToken,
  buildCaption,
  collectPropertyImageUrls,
  publishToFBPage,
  publishToInstagram,
  deleteFBPost,
  deleteIGMedia,
} from '@/lib/meta'

export const dynamic = 'force-dynamic'

// POST /api/meta/publish
// Body: { propertyId: string, target?: "fb" | "ig" | "both" (default "both") }
//
// Publishes a property to the connected Facebook Page and/or Instagram Business
// account. Idempotent: if a listing already exists with status=active, returns
// the existing record instead of republishing.
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { propertyId, target: rawTarget } = body as { propertyId?: string; target?: string }
    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId es requerido' }, { status: 400 })
    }

    const target = (rawTarget === 'fb' || rawTarget === 'ig') ? rawTarget : 'both'

    // Existing listing?
    const existing = await prisma.metaListing.findUnique({ where: { propertyId } })
    if (existing && existing.status === 'active') {
      return NextResponse.json({
        success: true,
        alreadyPublished: true,
        listing: existing,
      })
    }

    const property = await prisma.property.findUnique({ where: { id: propertyId } })
    if (!property) {
      return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 })
    }
    if (!property.active) {
      return NextResponse.json({ error: 'La propiedad no está activa' }, { status: 400 })
    }

    // Resolve a valid Page token (refreshes user token if needed).
    let pageCreds: { pageId: string; pageAccessToken: string; igBusinessAccountId: string; igUsername: string }
    try {
      pageCreds = await getValidPageToken()
    } catch (err: any) {
      return NextResponse.json(
        { error: err.message || 'No hay conexión de Meta activa', needsAuth: true },
        { status: 401 }
      )
    }

    const caption = buildCaption(property)
    const images = collectPropertyImageUrls(property)

    const errors: string[] = []
    let fbPostId = ''
    let fbPermalink = ''
    let igMediaId = ''
    let igPermalink = ''

    // Facebook Page
    if (target === 'fb' || target === 'both') {
      try {
        const fb = await publishToFBPage(pageCreds.pageId, pageCreds.pageAccessToken, caption, images)
        fbPostId = fb.postId
        fbPermalink = fb.permalink
      } catch (err: any) {
        errors.push(`Facebook: ${err.message}`)
      }
    }

    // Instagram Business
    if (target === 'ig' || target === 'both') {
      if (!pageCreds.igBusinessAccountId) {
        errors.push(
          'Instagram: la Página seleccionada no tiene una Cuenta de Instagram Business vinculada.'
        )
      } else if (images.length === 0) {
        errors.push('Instagram: la propiedad no tiene imágenes publicables (URLs https).')
      } else {
        try {
          const ig = await publishToInstagram(
            pageCreds.igBusinessAccountId,
            pageCreds.pageAccessToken,
            caption,
            images[0]
          )
          igMediaId = ig.mediaId
          igPermalink = ig.permalink
        } catch (err: any) {
          errors.push(`Instagram: ${err.message}`)
        }
      }
    }

    const status = errors.length === 0 || (fbPostId || igMediaId) ? 'active' : 'error'
    const errorMessage = errors.join(' | ').substring(0, 500)

    const listing = await prisma.metaListing.upsert({
      where: { propertyId },
      create: {
        propertyId,
        fbPostId,
        fbPermalink,
        igMediaId,
        igPermalink,
        status,
        target,
        errorMessage,
        lastSynced: new Date(),
      },
      update: {
        fbPostId,
        fbPermalink,
        igMediaId,
        igPermalink,
        status,
        target,
        errorMessage,
        lastSynced: new Date(),
      },
    })

    if (status === 'error') {
      return NextResponse.json({ error: errorMessage, listing }, { status: 500 })
    }

    return NextResponse.json({ success: true, listing })
  } catch (error: any) {
    console.error('Meta publish error:', error)
    return NextResponse.json(
      { error: 'Error al publicar en Meta', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/meta/publish
// Body: { propertyId: string }
//
// Removes the FB Page post and IG media (best-effort), and marks the listing
// as 'removed' in the DB. Keeps the row for historical record.
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { propertyId } = body as { propertyId?: string }
    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId es requerido' }, { status: 400 })
    }

    const listing = await prisma.metaListing.findUnique({ where: { propertyId } })
    if (!listing) {
      return NextResponse.json({ error: 'No hay publicación de Meta para esta propiedad' }, { status: 404 })
    }

    let pageCreds: { pageId: string; pageAccessToken: string; igBusinessAccountId: string; igUsername: string } | null = null
    try {
      pageCreds = await getValidPageToken()
    } catch (err: any) {
      // Token invalid — we still mark the listing as removed locally so the UI
      // updates, but the actual FB/IG posts will have to be deleted manually.
      console.warn('Meta token unavailable during DELETE publish:', err.message)
    }

    const errors: string[] = []

    if (pageCreds) {
      // Delete FB post
      if (listing.fbPostId) {
        try {
          await deleteFBPost(listing.fbPostId, pageCreds.pageAccessToken)
        } catch (err: any) {
          errors.push(`Facebook: ${err.message}`)
        }
      }
      // Delete IG media
      if (listing.igMediaId) {
        try {
          await deleteIGMedia(listing.igMediaId, pageCreds.pageAccessToken)
        } catch (err: any) {
          errors.push(`Instagram: ${err.message}`)
        }
      }
    }

    await prisma.metaListing.update({
      where: { propertyId },
      data: {
        status: 'removed',
        errorMessage: errors.join(' | ').substring(0, 500),
        lastSynced: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: errors.length
        ? `Publicación eliminada localmente. Algunos elementos no se pudieron borrar: ${errors.join('; ')}`
        : 'Publicación eliminada de Facebook e Instagram',
    })
  } catch (error: any) {
    console.error('Meta unpublish error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
