import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exchangeCodeForToken, getMLCredentials } from '@/lib/mercadolibre'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://fzacaria.com.ar'

// GET - OAuth callback from Mercado Libre
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        `${SITE_URL}/admin/mercadolibre?ml_error=${encodeURIComponent(searchParams.get('error_description') || error)}`
      )
    }

    if (!code) {
      return NextResponse.redirect(
        `${SITE_URL}/admin/mercadolibre?ml_error=no_code`
      )
    }

    const creds = await getMLCredentials()
    if (!creds) {
      return NextResponse.redirect(
        `${SITE_URL}/admin/mercadolibre?ml_error=${encodeURIComponent('Credenciales no configuradas')}`
      )
    }

    // Use the exact redirect URI that was used in the auth URL
    const redirectUri = `${SITE_URL}/api/mercadolibre/auth/callback`
    const tokenData = await exchangeCodeForToken(code, creds.appId, creds.appSecret, redirectUri)

    // Save token to database
    // Delete any existing tokens first to avoid duplicates
    await prisma.mercadoLibreToken.deleteMany({})

    await prisma.mercadoLibreToken.create({
      data: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        expiresIn: tokenData.expires_in,
        scope: tokenData.scope || '',
        tokenType: tokenData.token_type || 'Bearer',
        mlUserId: tokenData.user_id ? String(tokenData.user_id) : '',
      },
    })

    return NextResponse.redirect(
      `${SITE_URL}/admin/mercadolibre?ml_connected=1`
    )
  } catch (error: any) {
    console.error('ML auth callback error:', error)
    return NextResponse.redirect(
      `${SITE_URL}/admin/mercadolibre?ml_error=${encodeURIComponent(error.message)}`
    )
  }
}
