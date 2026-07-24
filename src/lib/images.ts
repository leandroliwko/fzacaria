/**
 * Normalize image URLs to ensure they work through the proxy.
 * Old uploads use /uploads/xxx format, new ones use /api/uploads/xxx.
 * This converts old format to new format for consistent proxy support.
 */
export function normalizeImageUrl(url: string): string {
  if (!url) return ''
  // Convert /uploads/xxx to /api/uploads/xxx (our API route that works through proxy)
  if (url.startsWith('/uploads/')) {
    return url.replace('/uploads/', '/api/uploads/')
  }
  // External URLs (like unsplash) or already normalized URLs pass through
  return url
}

/**
 * Normalize a comma-separated list of image URLs
 */
export function normalizeImageUrls(images: string): string[] {
  if (!images) return []
  return images.split(',').filter(Boolean).map(normalizeImageUrl)
}
