/**
 * Resolve image URLs - handles both relative uploads paths and absolute URLs
 */
export function resolveImageUrl(imageUrl: string | undefined | null): string | undefined {
  if (!imageUrl) return undefined

  // Already an absolute URL (http/https or data: URI)
  if (imageUrl.startsWith('http') || imageUrl.startsWith('data:') || imageUrl.startsWith('/')) {
    return imageUrl
  }

  // Relative path - prepend /uploads/
  return `/uploads/${imageUrl}`
}
