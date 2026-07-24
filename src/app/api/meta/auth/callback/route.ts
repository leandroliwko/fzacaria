import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getMetaCredentials,
  exchangeCodeForToken,
  exchangeLongLivedToken,
  getUserProfile,
  getUserPages,
  getIgBusinessAccountForPage,
} from '@/lib/meta'

export const dynamic = 'force-dynamic'

// GET - OAuth callback from Facebook.
//
// Flow:
//   1. Facebook redirects here with ?code=...
//   2. Exchange code → short-lived user token (≈1 hour)
//   3. Exchange short → long-lived user token (≈60 days)
//   4. List the user's Pages; pick the FIRST one (the user can change later)
//   5. Try to resolve the Page's linked Instagram Business account
//   6. Persist everything in MetaToken
//   7. Redirect back to /admin/meta?meta_connected=1 (or ?meta_error=...)
export async function GET(request: NextRequest) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fzacaria.com.ar'
  const adminPath = `${siteUrl}/admin/meta`

  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const errorReason = searchParams.get('error_reason') || searchParams.get('error_description') || error

    if (error) {
      return NextResponse.redirect(
        `${adminPath}?meta_error=${encodeURIComponent(errorReason || error)}`
      )
    }
    if (!code) {
      return NextResponse.redirect(`${adminPath}?meta_error=no_code`)
    }

    const creds = await getMetaCredentials()
    if (!creds) {
      return NextResponse.redirect(
        `${adminPath}?meta_error=${encodeURIComponent('Credenciales de Meta no configuradas')}`
      )
    }

    // 1. Exchange code for short-lived token.
    const shortToken = await exchangeCodeForToken(
      code,
      creds.appId,
      creds.appSecret,
      creds.redirectUri
    )

    // 2. Exchange for long-lived token.
    const longToken = await exchangeLongLivedToken(shortToken.access_token, creds.appId, creds.appSecret)

    // 3. Fetch user profile.
    let profile: { id: string; name: string; email?: string } = { id: '', name: '' }
    try {
      profile = await getUserProfile(longToken.access_token)
    } catch (err: any) {
      console.warn('Meta /me failed (continuing):', err.message)
    }

    // 4. List Pages.
    const pages = await getUserPages(longToken.access_token)
    if (!pages.length) {
      return NextResponse.redirect(
        `${adminPath}?meta_error=${encodeURIComponent(
          'Tu cuenta de Facebook no administra ninguna Página. Creá una Página primero en facebook.com.'
        )}`
      )
    }

    // Pick the first Page (we'll let the user switch later if needed).
    const page = pages[0]

    // 5. Resolve IG Business account for that Page.
    let igId = ''
    let igUsername = ''
    try {
      const ig = await getIgBusinessAccountForPage(page.id, page.access_token)
      if (ig) {
        igId = ig.igId
        igUsername = ig.username
      }
    } catch (err: any) {
      console.warn('IG business account lookup failed (continuing):', err.message)
    }

    // 6. Persist the token.
    const now = new Date()
    const expiresAt = new Date(now.getTime() + (longToken.expires_in || 0) * 1000)

    // Deactivate any previous tokens, then create a new one.
    await prisma.metaToken.updateMany({
      where: { active: true },
      data: { active: false },
    }).catch(() => {})

    await prisma.metaToken.create({
      data: {
        accessToken: longToken.access_token,
        tokenType: longToken.token_type || 'Bearer',
        expiresIn: longToken.expires_in || 0,
        expiresAt,
        scope: '',
        userId: profile.id || '',
        userName: profile.name || '',
        userEmail: profile.email || '',
        pageId: page.id,
        pageName: page.name || '',
        pageAccessToken: page.access_token,
        igBusinessAccountId: igId,
        igUsername: igUsername,
        active: true,
      },
    })

    const params = new URLSearchParams()
    params.set('meta_connected', '1')
    if (page.name) params.set('meta_page', page.name)
    if (igUsername) params.set('meta_ig', igUsername)
    return NextResponse.redirect(`${adminPath}?${params.toString()}`)
  } catch (error: any) {
    console.error('Meta auth callback error:', error)
    return NextResponse.redirect(
      `${adminPath}?meta_error=${encodeURIComponent(error.message)}`
    )
  }
}
