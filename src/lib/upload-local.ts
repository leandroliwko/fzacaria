/**
 * Local file upload utility - replaces @vercel/blob
 * Saves files to public/uploads/ directory on the server filesystem.
 * Compatible with Railway (persistent volume) and any Node.js hosting.
 */

import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

/**
 * Get the base URL for uploads based on the current environment.
 */
function getBaseUrl(): string {
  // In production, use the site URL env var or the request host
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  }
  // Fallback for Railway
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  }
  return ''
}

/**
 * Upload a file to the local filesystem.
 * Returns a publicly accessible URL for the file.
 */
export async function localPut(
  filename: string,
  data: Buffer | Blob | File | ReadableStream,
  options: {
    contentType?: string
    access?: string
  } = {}
): Promise<{ url: string }> {
  // Ensure upload directory exists
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true })
  }

  // Add unique suffix to filename to avoid collisions
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  const lastDot = filename.lastIndexOf('.')
  const uniqueName = lastDot > 0
    ? filename.substring(0, lastDot) + '_' + randomSuffix + filename.substring(lastDot)
    : filename + '_' + randomSuffix

  const filePath = path.join(UPLOAD_DIR, uniqueName)

  // Convert data to Buffer
  let buffer: Buffer
  if (data instanceof Buffer) {
    buffer = data
  } else if (data instanceof Blob || data instanceof File) {
    const arrayBuffer = await data.arrayBuffer()
    buffer = Buffer.from(arrayBuffer)
  } else {
    // ReadableStream
    const chunks: Uint8Array[] = []
    const reader = (data as ReadableStream).getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    buffer = Buffer.concat(chunks)
  }

  // Write file to disk
  await writeFile(filePath, buffer)

  // Return public URL
  const baseUrl = getBaseUrl()
  const url = `${baseUrl}/uploads/${uniqueName}`

  return { url }
}

/**
 * Delete a file from the local filesystem by URL.
 */
export async function localDel(url: string): Promise<void> {
  try {
    const { unlink } = await import('fs/promises')
    // Extract filename from URL
    const filename = url.split('/uploads/').pop()
    if (!filename) return
    
    const filePath = path.join(UPLOAD_DIR, filename)
    if (existsSync(filePath)) {
      await unlink(filePath)
    }
  } catch (error) {
    console.warn('Failed to delete file:', error)
  }
}

/**
 * Convert a potentially old Vercel Blob URL to a local URL.
 * If the URL is already a local path, return it as-is.
 */
export function normalizeUrl(url: string): string {
  if (!url) return url
  // Already a local upload
  if (url.includes('/uploads/')) return url
  // Already an external image (unsplash, etc.)
  if (url.startsWith('http') && !url.includes('blob.vercel-storage.com') && !url.includes('public.blob.vercel-storage.com')) return url
  // For old Vercel Blob URLs, they'll need to be migrated
  // For now, return as-is (they'll still work if Vercel Blob is still accessible)
  return url
}
