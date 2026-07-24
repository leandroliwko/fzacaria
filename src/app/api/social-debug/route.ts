import { NextRequest, NextResponse } from 'next/server'

/**
 * Social media debug endpoint — helps verify OG tags are working correctly.
 * Usage: /api/social-debug?url=https://fzacaria.com.ar/propiedad/xxx
 * 
 * Fetches a page URL (from our own site) and extracts all OG/Twitter meta tags.
 * This is useful for debugging social media sharing without needing external tools.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({
      error: 'Missing url parameter',
      usage: '/api/social-debug?url=https://fzacaria.com.ar/propiedad/xxx',
    }, { status: 400 })
  }

  // Only allow our own domain for security
  if (!url.includes('fzacaria.com.ar')) {
    return NextResponse.json({ error: 'Only fzacaria.com.ar URLs are allowed' }, { status: 400 })
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      return NextResponse.json({
        error: `Page returned ${res.status}`,
        url,
      }, { status: 200 })
    }

    const html = await res.text()

    // Extract all meta tags — handle multiple values for same key (e.g., multiple og:image)
    const metaRegex = /<meta\s+([^>]+)>/g
    const tags: Record<string, string | string[]> = {}
    let match

    while ((match = metaRegex.exec(html)) !== null) {
      const tag = match[1]
      // Extract property/name and content
      const propMatch = tag.match(/(?:property|name)=["']([^"']+)["']/)
      const contentMatch = tag.match(/content=["']([^"']+)["']/)
      if (propMatch && contentMatch) {
        const key = propMatch[1]
        const value = contentMatch[1]
        // Handle multiple values for same key (e.g., og:image, twitter:image)
        if (tags[key] !== undefined) {
          const existing = tags[key]
          if (Array.isArray(existing)) {
            existing.push(value)
          } else {
            tags[key] = [existing, value]
          }
        } else {
          tags[key] = value
        }
      }
    }

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/)
    const title = titleMatch ? titleMatch[1] : ''

    // Filter OG and Twitter tags
    const ogTags: Record<string, string | string[]> = {}
    const twitterTags: Record<string, string | string[]> = {}
    const otherTags: Record<string, string | string[]> = {}

    for (const [key, value] of Object.entries(tags)) {
      if (key.startsWith('og:')) {
        ogTags[key] = value
      } else if (key.startsWith('twitter:')) {
        twitterTags[key] = value
      } else if (['description', 'author', 'keywords'].includes(key)) {
        otherTags[key] = value
      }
    }

    // Validate critical OG tags
    const issues: string[] = []
    if (!ogTags['og:title']) issues.push('Missing og:title')
    if (!ogTags['og:description']) issues.push('Missing og:description')
    if (!ogTags['og:image']) issues.push('Missing og:image')
    if (!ogTags['og:url']) issues.push('Missing og:url')
    if (!ogTags['og:type']) issues.push('Missing og:type')
    if (!twitterTags['twitter:card']) issues.push('Missing twitter:card')

    // Validate OG image URL format
    const ogImage = Array.isArray(ogTags['og:image']) ? ogTags['og:image'][0] : ogTags['og:image']
    if (ogImage) {
      if (!ogImage.startsWith('https://')) {
        issues.push('og:image should use HTTPS URL')
      }
      // Check for common broken URL patterns
      if (ogImage.includes('data:')) {
        issues.push('og:image is a data: URI — Facebook cannot fetch these')
      }
    }

    return NextResponse.json({
      url,
      status: res.status,
      title,
      openGraph: ogTags,
      twitter: twitterTags,
      other: otherTags,
      issues: issues.length > 0 ? issues : ['All critical OG tags present'],
      ready: issues.length === 0,
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Failed to fetch page',
      url,
    }, { status: 500 })
  }
}
