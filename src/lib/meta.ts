/**
 * Meta Business API Integration - Utility functions
 * Handles OAuth (Facebook Login), long-lived token exchange,
 * Page access token resolution, and publishing to:
 *   - Facebook Page (photos / feed post)
 *   - Instagram Business Account (container → publish flow)
 *
 * Reference:
 *   - https://developers.facebook.com/docs/facebook-login
 *   - https://developers.facebook.com/docs/pages-access-tokens
 *   - https://developers.facebook.com/docs/instagram-api/guides/content-publishing
 */

import { prisma } from '@/lib/prisma'

const GRAPH_API_BASE = 'https://graph.facebook.com'
const GRAPH_API_VERSION = 'v21.0'
const FB_DIALOG_BASE = 'https://www.facebook.com'

// Scopes needed for publishing to a Page + Instagram Business account
//   pages_show_list        - list Pages the user manages
//   pages_read_engagement  - read Page insights/engagement
//   pages_read_user_content- read Page posts
//   pages_manage_posts     - create/edit Page posts
//   pages_manage_engagement- comment / react as the Page
//   instagram_basic        - basic IG profile info
//   instagram_content_publish - publish to IG (container flow)
//   business_management    - manage business portfolio (recommended)
export const META_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_read_user_content',
  'pages_manage_posts',
  'pages_manage_engagement',
  'instagram_basic',
  'instagram_content_publish',
  'business_management',
].join(',')

// ============================================================
// Credentials
// ============================================================

export async function getMetaCredentials(): Promise<{
  appId: string
  appSecret: string
  redirectUri: string
} | null> {
  // Try DB first
  try {
    const settings = await prisma.metaSettings.findFirst()
    if (settings?.appId && settings?.appSecret) {
      return {
        appId: settings.appId,
        appSecret: settings.appSecret,
        redirectUri:
          settings.redirectUri ||
          `${process.env.NEXT_PUBLIC_SITE_URL || 'https://fzacaria.com.ar'}/api/meta/auth/callback`,
      }
    }
  } catch {}

  // Fallback to env vars
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  if (appId && appSecret) {
    return {
      appId,
      appSecret,
      redirectUri: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://fzacaria.com.ar'}/api/meta/auth/callback`,
    }
  }

  return null
}

// ============================================================
// OAuth URL
// ============================================================

export function getAuthUrl(appId: string, redirectUri: string, state?: string): string {
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: META_SCOPES,
    auth_type: 'rerequest',
  })
  if (state) params.set('state', state)
  return `${FB_DIALOG_BASE}/${GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`
}

// ============================================================
// Token exchange (short-lived → long-lived)
// ============================================================

// Exchange OAuth code for a short-lived user access token (≈1 hour)
export async function exchangeCodeForToken(
  code: string,
  appId: string,
  appSecret: string,
  redirectUri: string
): Promise<{
  access_token: string
  token_type: string
  expires_in: number
}> {
  const url = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/oauth/access_token?${new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  }).toString()}`

  const res = await fetch(url, { method: 'GET' })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Meta code exchange failed: ${data.error?.message || JSON.stringify(data)}`)
  }
  return data
}

// Exchange a short-lived user token for a long-lived one (≈60 days)
export async function exchangeLongLivedToken(
  shortToken: string,
  appId: string,
  appSecret: string
): Promise<{
  access_token: string
  token_type: string
  expires_in: number
}> {
  const url = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/oauth/access_token?${new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortToken,
  }).toString()}`

  const res = await fetch(url, { method: 'GET' })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Meta long-lived exchange failed: ${data.error?.message || JSON.stringify(data)}`)
  }
  return data
}

// Refresh a long-lived user token (resets the 60-day window).
// Long-lived user tokens can be refreshed with the same exchange endpoint,
// but only if the token is still valid.
export async function refreshLongLivedToken(
  longToken: string,
  appId: string,
  appSecret: string
): Promise<{ access_token: string; expires_in: number }> {
  return exchangeLongLivedToken(longToken, appId, appSecret)
}

// ============================================================
// User identity (who authorized?)
// ============================================================

export async function getUserProfile(
  userAccessToken: string
): Promise<{ id: string; name: string; email?: string }> {
  const url = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/me?fields=id,name,email&access_token=${encodeURIComponent(userAccessToken)}`
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Meta /me failed: ${data.error?.message || JSON.stringify(data)}`)
  }
  return data
}

// ============================================================
// Page discovery + IG business account resolution
// ============================================================

export interface MetaPage {
  id: string
  name: string
  access_token: string
  category?: string
  tasks?: string[]
}

// List the Facebook Pages the user manages, with their per-Page access tokens.
export async function getUserPages(userAccessToken: string): Promise<MetaPage[]> {
  const url = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/me/accounts?fields=id,name,access_token,category,tasks&limit=100&access_token=${encodeURIComponent(userAccessToken)}`
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Meta /me/accounts failed: ${data.error?.message || JSON.stringify(data)}`)
  }
  return data.data || []
}

// For a given Page ID + Page token, find the linked Instagram Business Account ID.
// Returns null if the page has no IG Business account linked.
export async function getIgBusinessAccountForPage(
  pageId: string,
  pageAccessToken: string
): Promise<{ igId: string; username: string } | null> {
  const url = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${pageId}?fields=instagram_business_account&access_token=${encodeURIComponent(pageAccessToken)}`
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Meta page IG lookup failed: ${data.error?.message || JSON.stringify(data)}`)
  }
  const igId = data.instagram_business_account?.id
  if (!igId) return null

  // Fetch username
  const profileUrl = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${igId}?fields=username,profile_picture_url&access_token=${encodeURIComponent(pageAccessToken)}`
  const profRes = await fetch(profileUrl)
  const profData = await profRes.json()
  if (!profRes.ok) {
    // Still return the id, just no username
    return { igId, username: '' }
  }
  return { igId, username: profData.username || '' }
}

// ============================================================
// Token storage / retrieval / refresh
// ============================================================

export interface MetaTokenRow {
  id: string
  accessToken: string
  expiresAt: Date
  pageId: string
  pageName: string
  pageAccessToken: string
  igBusinessAccountId: string
  igUsername: string
}

// Get the active Meta token row from the DB (most recent first)
export async function getMetaTokenRow(): Promise<MetaTokenRow | null> {
  const row = await prisma.metaToken.findFirst({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  })
  if (!row) return null
  return {
    id: row.id,
    accessToken: row.accessToken,
    expiresAt: row.expiresAt,
    pageId: row.pageId,
    pageName: row.pageName,
    pageAccessToken: row.pageAccessToken,
    igBusinessAccountId: row.igBusinessAccountId,
    igUsername: row.igUsername,
  }
}

/**
 * Returns a valid (non-expired) page access token + page ID + IG id, refreshing
 * the long-lived user token if necessary.
 *
 * Page access tokens derived from a long-lived user token do NOT expire
 * (as long as the user token stays valid), so we only need to refresh the
 * user token before the 60-day window closes.
 */
export async function getValidPageToken(): Promise<{
  pageId: string
  pageAccessToken: string
  igBusinessAccountId: string
  igUsername: string
}> {
  const creds = await getMetaCredentials()
  if (!creds) {
    throw new Error('No hay credenciales de Meta configuradas.')
  }
  const { appId, appSecret } = creds

  const row = await getMetaTokenRow()
  if (!row) {
    throw new Error('No hay token de Meta. Conectá tu cuenta de Facebook primero.')
  }
  if (!row.pageId || !row.pageAccessToken) {
    throw new Error('Token sin página seleccionada. Reconectá tu cuenta de Facebook.')
  }

  // If user token is close to expiry (< 7 days), refresh it and re-fetch page tokens.
  const now = new Date()
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  if (row.expiresAt.getTime() - now.getTime() < sevenDays) {
    try {
      const refreshed = await refreshLongLivedToken(row.accessToken, appId, appSecret)
      const newExpiresAt = new Date(now.getTime() + (refreshed.expires_in || 0) * 1000)

      // Re-fetch the page token (the previous page token is still valid, but
      // re-fetching ensures we have a fresh one tied to the new user token).
      const pages = await getUserPages(refreshed.access_token)
      const matchingPage = pages.find((p) => p.id === row.pageId) || pages[0]
      if (!matchingPage) {
        // Keep old page token if page list is empty (edge case)
        await prisma.metaToken.update({
          where: { id: row.id },
          data: {
            accessToken: refreshed.access_token,
            expiresIn: refreshed.expires_in,
            expiresAt: newExpiresAt,
          },
        })
        return {
          pageId: row.pageId,
          pageAccessToken: row.pageAccessToken,
          igBusinessAccountId: row.igBusinessAccountId,
          igUsername: row.igUsername,
        }
      }

      // Refresh IG info too
      let igId = row.igBusinessAccountId
      let igUsername = row.igUsername
      if (!igId) {
        const ig = await getIgBusinessAccountForPage(matchingPage.id, matchingPage.access_token)
        if (ig) {
          igId = ig.igId
          igUsername = ig.username
        }
      }

      await prisma.metaToken.update({
        where: { id: row.id },
        data: {
          accessToken: refreshed.access_token,
          expiresIn: refreshed.expires_in,
          expiresAt: newExpiresAt,
          pageAccessToken: matchingPage.access_token,
          pageId: matchingPage.id,
          pageName: matchingPage.name || row.pageName,
          igBusinessAccountId: igId,
          igUsername: igUsername,
        },
      })

      return {
        pageId: matchingPage.id,
        pageAccessToken: matchingPage.access_token,
        igBusinessAccountId: igId,
        igUsername: igUsername,
      }
    } catch (err: any) {
      // If refresh fails, fall through and use the existing token — it may still
      // be valid for a few more days.
      console.warn('Meta token refresh failed, using existing token:', err.message)
    }
  }

  return {
    pageId: row.pageId,
    pageAccessToken: row.pageAccessToken,
    igBusinessAccountId: row.igBusinessAccountId,
    igUsername: row.igUsername,
  }
}

// ============================================================
// Property → post caption / image helpers
// ============================================================

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
  venta: 'VENTA',
  alquiler: 'ALQUILER',
  temporario: 'ALQUILER TEMPORARIO',
}

// Build the caption text for a property post (used by both FB and IG).
export function buildCaption(property: any): string {
  const opLabel = operationLabels[property.operation] || property.operation?.toUpperCase() || ''
  const tpLabel = typeLabels[property.type] || property.type || ''
  const code = property.code || ''

  const lines: string[] = []
  lines.push(`🏠 ${opLabel} - ${tpLabel}`)
  if (property.title) lines.push(property.title)
  lines.push('')
  if (property.price) lines.push(`💰 Precio: ${property.price}`)
  if (property.location) lines.push(`📍 ${property.location}`)
  if (property.bedrooms > 0) lines.push(`🛏️ ${property.bedrooms} dormitorio${property.bedrooms === 1 ? '' : 's'}`)
  if (property.bathrooms > 0) lines.push(`🚿 ${property.bathrooms} baño${property.bathrooms === 1 ? '' : 's'}`)
  if (property.area > 0) lines.push(`📐 ${property.area} m²`)
  if (property.coveredArea) lines.push(`🏠 Cubierta: ${property.coveredArea} m²`)

  // Amenities
  const extras = (property.extras || '')
    .split(',')
    .map((e: string) => e.trim())
    .filter(Boolean)
  if (extras.length > 0) {
    lines.push('')
    lines.push('✨ Amenities:')
    lines.push(extras.map((e: string) => `• ${e}`).join('\n'))
  }

  // Description (truncated to keep IG caption under 2200 chars)
  if (property.description) {
    lines.push('')
    const desc = property.description.length > 800
      ? property.description.substring(0, 800) + '…'
      : property.description
    lines.push(desc)
  }

  lines.push('')
  lines.push('─'.repeat(20))
  lines.push('🔑 Inmobiliaria Florencia Zacaria')
  lines.push('📞 (02255) 612345')
  lines.push('💬 WhatsApp: +54 9 2255 612345')
  lines.push('🌐 www.fzacaria.com.ar')
  if (code) lines.push(`🔖 Código: ${code}`)

  // Public URL of the property on the site
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fzacaria.com.ar'
  lines.push(`🔗 ${siteUrl}/propiedad/${property.id}`)

  // Hashtags (best for IG)
  lines.push('')
  lines.push(
    [
      '#inmobiliaria',
      '#pinamar',
      `#${property.operation === 'venta' ? 'venta' : property.operation === 'alquiler' ? 'alquiler' : 'alquilertemporario'}`,
      `#${property.type}`,
      '#fzacaria',
      '#properties',
      '#realestate',
      '#argentina',
    ]
      .filter(Boolean)
      .join(' ')
  )

  return lines.join('\n')
}

// Collect all valid http(s) image URLs from a property (cover + gallery).
export function collectPropertyImageUrls(property: any): string[] {
  const urls: string[] = []
  if (property.image && /^https?:\/\//i.test(property.image)) {
    urls.push(property.image)
  }
  if (property.images) {
    let parsed: any = property.images
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed)
      } catch {
        parsed = parsed.split(',').map((s) => s.trim()).filter(Boolean)
      }
    }
    if (Array.isArray(parsed)) {
      for (const img of parsed) {
        if (typeof img === 'string' && /^https?:\/\//i.test(img) && !urls.includes(img)) {
          urls.push(img)
        }
      }
    }
  }
  return urls
}

// ============================================================
// Publishing: Facebook Page
// ============================================================

// Publish a multi-photo post to a Facebook Page using the /{page-id}/photos endpoint
// with `published=true` and a caption. Up to 10 photos per post.
//
// Returns the FB post id + permalink.
export async function publishToFBPage(
  pageId: string,
  pageAccessToken: string,
  caption: string,
  imageUrls: string[]
): Promise<{ postId: string; permalink: string }> {
  // No images → simple feed post
  if (imageUrls.length === 0) {
    const url = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${pageId}/feed`
    const body: any = {
      message: caption,
      access_token: pageAccessToken,
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(`FB feed publish failed: ${data.error?.message || JSON.stringify(data)}`)
    }
    const postId = data.id as string
    const permalink = await resolveFbPermalink(postId, pageAccessToken)
    return { postId, permalink }
  }

  // Multi-photo post: attach each image via /{page-id}/photos with published=false,
  // then create a single feed post that references them.
  // For a single image, simpler path: POST /{page-id}/photos with caption.
  if (imageUrls.length === 1) {
    const url = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${pageId}/photos`
    const body = {
      url: imageUrls[0],
      caption,
      published: true,
      access_token: pageAccessToken,
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(`FB photo publish failed: ${data.error?.message || JSON.stringify(data)}`)
    }
    const postId = data.post_id || data.id
    const permalink = await resolveFbPermalink(postId, pageAccessToken)
    return { postId, permalink }
  }

  // Multiple images: staged children + parent feed post
  const attachedMediaIds: string[] = []
  for (const imgUrl of imageUrls.slice(0, 10)) {
    const stageUrl = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${pageId}/photos`
    const stageBody = {
      url: imgUrl,
      published: false,
      access_token: pageAccessToken,
    }
    const stageRes = await fetch(stageUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stageBody),
    })
    const stageData = await stageRes.json()
    if (!stageRes.ok) {
      throw new Error(`FB photo staging failed: ${stageData.error?.message || JSON.stringify(stageData)}`)
    }
    attachedMediaIds.push(stageData.id)
  }

  const feedUrl = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${pageId}/feed`
  const feedBody = {
    message: caption,
    attached_media: attachedMediaIds.map((id) => ({ media_fbid: id })),
    access_token: pageAccessToken,
  }
  const feedRes = await fetch(feedUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(feedBody),
  })
  const feedData = await feedRes.json()
  if (!feedRes.ok) {
    throw new Error(`FB multi-photo publish failed: ${feedData.error?.message || JSON.stringify(feedData)}`)
  }

  const postId = feedData.id
  const permalink = await resolveFbPermalink(postId, pageAccessToken)
  return { postId, permalink }
}

// Resolve a FB post id to a public permalink URL.
async function resolveFbPermalink(postId: string, accessToken: string): Promise<string> {
  try {
    const url = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${postId}?fields=permalink_url&access_token=${encodeURIComponent(accessToken)}`
    const res = await fetch(url)
    const data = await res.json()
    if (res.ok && data.permalink_url) return data.permalink_url
  } catch {}
  // Fallback: construct from post ID (page_post format: PAGEID_POSTID)
  if (postId.includes('_')) {
    const [pageId, realPostId] = postId.split('_')
    return `https://www.facebook.com/${pageId}/posts/${realPostId}`
  }
  return `https://www.facebook.com/${postId}`
}

// Delete a FB Page post.
export async function deleteFBPost(postId: string, pageAccessToken: string): Promise<boolean> {
  const url = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${postId}?access_token=${encodeURIComponent(pageAccessToken)}`
  const res = await fetch(url, { method: 'DELETE' })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`FB delete failed: ${data.error?.message || JSON.stringify(data)}`)
  }
  return data.success !== false
}

// ============================================================
// Publishing: Instagram Business Account
//
// IG requires a 2-step container flow:
//   1. POST /{ig-user-id}/media   → create a media container
//   2. POST /{ig-user-id}/media_publish → publish the container
//
// Only ONE image per container. For multiple images, create multiple
// containers and publish them as a carousel (children) — but that's
// more complex. For simplicity we publish just the first image.
// ============================================================

export async function publishToInstagram(
  igBusinessAccountId: string,
  pageAccessToken: string,
  caption: string,
  imageUrl: string
): Promise<{ mediaId: string; permalink: string }> {
  if (!imageUrl) {
    throw new Error('Instagram requiere al menos una imagen.')
  }

  // 1. Create the media container.
  const containerUrl = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${igBusinessAccountId}/media`
  const containerBody = {
    image_url: imageUrl,
    caption,
    access_token: pageAccessToken,
  }
  const containerRes = await fetch(containerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(containerBody),
  })
  const containerData = await containerRes.json()
  if (!containerRes.ok) {
    throw new Error(`IG container creation failed: ${containerData.error?.message || JSON.stringify(containerData)}`)
  }
  const creationId = containerData.id
  if (!creationId) {
    throw new Error('IG container creation returned no id.')
  }

  // 2. Wait briefly (Meta needs time to process the image) before publishing.
  await new Promise((r) => setTimeout(r, 2000))

  // 3. Publish the container.
  const publishUrl = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${igBusinessAccountId}/media_publish`
  const publishBody = {
    creation_id: creationId,
    access_token: pageAccessToken,
  }
  const publishRes = await fetch(publishUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(publishBody),
  })
  const publishData = await publishRes.json()
  if (!publishRes.ok) {
    throw new Error(`IG publish failed: ${publishData.error?.message || JSON.stringify(publishData)}`)
  }
  const mediaId = publishData.id

  // 4. Resolve permalink.
  let permalink = ''
  try {
    const permalinkUrl = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${mediaId}?fields=permalink&access_token=${encodeURIComponent(pageAccessToken)}`
    const permRes = await fetch(permalinkUrl)
    const permData = await permRes.json()
    if (permRes.ok && permData.permalink) {
      permalink = permData.permalink
    }
  } catch {}
  if (!permalink) {
    permalink = `https://www.instagram.com/p/${mediaId}`
  }

  return { mediaId, permalink }
}

// Delete an IG media (best-effort; IG media is rarely deletable via API).
export async function deleteIGMedia(mediaId: string, pageAccessToken: string): Promise<boolean> {
  try {
    const url = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${mediaId}?access_token=${encodeURIComponent(pageAccessToken)}`
    const res = await fetch(url, { method: 'DELETE' })
    const data = await res.json()
    return data.success !== false
  } catch {
    return false
  }
}
