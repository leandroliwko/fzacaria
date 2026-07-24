/**
 * Resolve image URLs - handles Vercel Blob URLs, local uploads, and absolute URLs.
 */
export function resolveImageUrl(imageUrl: string | undefined | null): string | undefined {
  if (!imageUrl) return undefined

  // Already an absolute URL (Vercel Blob, http/https, data URI, or absolute path)
  if (imageUrl.startsWith('http') || imageUrl.startsWith('data:') || imageUrl.startsWith('/')) {
    return imageUrl
  }

  // Relative path - prepend /uploads/
  return `/uploads/${imageUrl}`
}
