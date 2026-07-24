import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Force no-cache for admin pages to prevent stale versions
  if (request.nextUrl.pathname.startsWith('/admin')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    response.headers.set('CDN-Cache-Control', 'no-store')
    response.headers.set('Vercel-CDN-Cache-Control', 'no-store')
  }

  // OG image route: cache for 1 hour on CDN (Facebook/Twitter need this)
  // This route generates branded 1200x630 images for social sharing previews
  if (request.nextUrl.pathname === '/api/property/og') {
    response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
    response.headers.set('CDN-Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    response.headers.set('Vercel-CDN-Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  }
  // Force no-cache for all other API routes to always return fresh data
  else if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    response.headers.set('CDN-Cache-Control', 'no-store')
    response.headers.set('Vercel-CDN-Cache-Control', 'no-store')
  }

  // Property pages: cache for 5 min on CDN, 1 hour stale-while-revalidate
  // This is important for social media crawlers (Facebook, Twitter, WhatsApp, etc.)
  // They need consistent OG meta tags and the page to load fast
  if (request.nextUrl.pathname.startsWith('/propiedad')) {
    response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
    response.headers.set('CDN-Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
    response.headers.set('Vercel-CDN-Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
  }
  // Homepage: cache for 1 min on CDN
  else if (request.nextUrl.pathname === '/') {
    response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
    response.headers.set('CDN-Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  }

  return response
}

export const config = {
  matcher: ['/', '/admin/:path*', '/propiedad/:path*', '/api/:path*'],
}
