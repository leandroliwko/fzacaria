/**
 * Local file upload utility — compatible with Vercel (serverless) and Railway (persistent).
 *
 * On Vercel: writes to /tmp/uploads (ephemeral but writable), served via /api/uploads/[filename].
 * On Railway / local: writes to public/uploads (persistent), served as static files.
 */

import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

/**
 * Detect if running on Vercel serverless (no persistent writable filesystem).
 */
function isVercel(): boolean {
  return !!process.env.VERCEL || !!process.env.VERCEL_ENV
}

/**
 * Get the upload directory — /tmp/uploads on Vercel, public/uploads elsewhere.
 */
function getUploadDir(): string {
  if (isVercel()) {
    return path.join('/tmp', 'uploads')
  }
  return path.join(process.cwd(), 'public', 'uploads')
}

/**
 * Get the base URL for uploads based on the current environment.
 */
function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  }
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
  const UPLOAD_DIR = getUploadDir()

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

  // Return public URL (served via /api/uploads/[filename] on Vercel, or /uploads/[filename] as static elsewhere)
  const baseUrl = getBaseUrl()
  const url = `${baseUrl}/api/uploads/${uniqueName}`

  return { url }
}

/**
 * Delete a file from the local filesystem by URL.
 */
export async function localDel(url: string): Promise<void> {
  try {
    const { unlink } = await import('fs/promises')
    const filename = url.split('/uploads/').pop() || url.split('/api/uploads/').pop()
    if (!filename) return

    const UPLOAD_DIR = getUploadDir()
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
  if (url.includes('/uploads/') || url.includes('/api/uploads/')) return url
  // Already an external image (unsplash, etc.)
  if (url.startsWith('http') && !url.includes('blob.vercel-storage.com') && !url.includes('public.blob.vercel-storage.com')) return url
  // For old Vercel Blob URLs, they'll need to be migrated
  return url
}
