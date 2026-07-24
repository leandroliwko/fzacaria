/**
 * Upload utility — uses Vercel Blob on Vercel (persistent, serverless-safe),
 * or local filesystem on Railway / local dev (persistent volume).
 *
 * On Vercel: @vercel/blob provides persistent cloud storage, no ephemeral /tmp issues.
 * On Railway: writes to public/uploads/ (persistent volume).
 */

import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

/**
 * Detect if running on Vercel serverless.
 */
function isVercel(): boolean {
  return !!process.env.VERCEL || !!process.env.VERCEL_ENV
}

/**
 * Get the local upload directory (for Railway / local dev).
 */
function getLocalUploadDir(): string {
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
 * Upload a file — uses Vercel Blob on Vercel, local filesystem elsewhere.
 */
export async function localPut(
  filename: string,
  data: Buffer | Blob | File | ReadableStream,
  options: {
    contentType?: string
    access?: string
  } = {}
): Promise<{ url: string }> {
  if (isVercel()) {
    // Use Vercel Blob for persistent cloud storage
    return await vercelBlobPut(filename, data, options)
  }

  // Use local filesystem for Railway / local dev
  return await localFilesystemPut(filename, data, options)
}

/**
 * Vercel Blob upload — persistent, works across serverless instances.
 */
async function vercelBlobPut(
  filename: string,
  data: Buffer | Blob | File | ReadableStream,
  options: {
    contentType?: string
    access?: string
  } = {}
): Promise<{ url: string }> {
  const { put } = await import('@vercel/blob')

  // Add unique suffix to filename to avoid collisions
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  const lastDot = filename.lastIndexOf('.')
  const uniqueName = lastDot > 0
    ? filename.substring(0, lastDot) + '_' + randomSuffix + filename.substring(lastDot)
    : filename + '_' + randomSuffix

  // Convert data to Buffer if needed
  let buffer: Buffer
  if (data instanceof Buffer) {
    buffer = data
  } else if (data instanceof Blob || data instanceof File) {
    const arrayBuffer = await data.arrayBuffer()
    buffer = Buffer.from(arrayBuffer)
  } else {
    const chunks: Uint8Array[] = []
    const reader = (data as ReadableStream).getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    buffer = Buffer.concat(chunks)
  }

  const result = await put(uniqueName, buffer, {
    access: 'public',
    contentType: options.contentType || undefined,
    addRandomSuffix: false, // we already added one
  })

  return { url: result.url }
}

/**
 * Local filesystem upload — for Railway / local dev with persistent volumes.
 */
async function localFilesystemPut(
  filename: string,
  data: Buffer | Blob | File | ReadableStream,
  options: {
    contentType?: string
    access?: string
  } = {}
): Promise<{ url: string }> {
  const UPLOAD_DIR = getLocalUploadDir()

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
 * Delete a file — uses Vercel Blob on Vercel, local filesystem elsewhere.
 */
export async function localDel(url: string): Promise<void> {
  try {
    if (isVercel() && url.includes('blob.vercel-storage.com')) {
      const { del } = await import('@vercel/blob')
      await del(url)
      return
    }

    // Local filesystem deletion
    const { unlink } = await import('fs/promises')
    const filename = url.split('/uploads/').pop()
    if (!filename) return

    const UPLOAD_DIR = getLocalUploadDir()
    const filePath = path.join(UPLOAD_DIR, filename)
    if (existsSync(filePath)) {
      await unlink(filePath)
    }
  } catch (error) {
    console.warn('Failed to delete file:', error)
  }
}

/**
 * Normalize URLs — handles both Vercel Blob and local filesystem URLs.
 */
export function normalizeUrl(url: string): string {
  if (!url) return url
  // Already a local upload or Vercel Blob URL
  if (url.includes('/uploads/') || url.includes('blob.vercel-storage.com')) return url
  // External images
  if (url.startsWith('http')) return url
  return url
}
