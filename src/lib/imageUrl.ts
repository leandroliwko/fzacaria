/**
 * Resolve image URLs - handles both relative uploads paths and absolute URLs.
 * On Vercel, runtime uploads go through /api/uploads/ instead of /uploads/ (static).
 */
export function resolveImageUrl(imageUrl: string | undefined | null): string | undefined {
  if (!imageUrl) return undefined

  // Already an absolute URL (http/https or data: URI)
  if (imageUrl.startsWith('http') || imageUrl.startsWith('data:') || imageUrl.startsWith('/')) {
    // Convert old /uploads/ paths to /api/uploads/ for consistent serving
    if (imageUrl.startsWith('/uploads/') && !imageUrl.startsWith('/api/uploads/')) {
      // Static uploads from public/uploads work fine as /uploads/ on Vercel too
      // (they're part of the deployment). Only runtime uploads need /api/uploads/.
      return imageUrl
    }
    return imageUrl
  }

  // Relative path - prepend /uploads/
  return `/uploads/${imageUrl}`
}
