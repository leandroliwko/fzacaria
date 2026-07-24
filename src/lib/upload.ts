/**
 * Robust upload utility — uses direct Vercel Blob upload for large files on Vercel,
 * API route for small files.
 *
 * Strategy (on Vercel):
 * 1. For files > 4.5MB (videos, large images): Direct upload to Vercel Blob
 *    using @vercel/blob/client upload() — bypasses serverless body size limit entirely.
 *    NO fallback to API route (which would always get 413 for large files).
 * 2. For files ≤ 4.5MB (resized images): Upload via /api/upload → Vercel Blob on server.
 *    This works because images are resized to < 4MB client-side.
 *
 * Strategy (on Railway/local):
 * 1. Upload via /api/upload → local filesystem
 *    No body size limit on Railway/local.
 *
 * For images: Auto-resize to WebP before upload for optimization.
 * For videos: Upload directly to Vercel Blob (no body size limit on client uploads).
 */

const MAX_RETRIES = 3
const BASE_DELAY_MS = 500

// Threshold: files > 4.5MB MUST use direct Blob upload on Vercel
// (API route body size limit is 4.5MB by default on Vercel, even Pro)
const DIRECT_UPLOAD_THRESHOLD = 4.5 * 1024 * 1024

/**
 * Upload a file — uses direct Vercel Blob upload for large files on Vercel,
 * API route for small files.
 */
export async function uploadFile(
  filename: string,
  file: File | Blob,
  options: {
    contentType?: string
    multipart?: boolean
    onUploadProgress?: (progress: { percentage: number }) => void
  } = {}
): Promise<string> {
  const isClientSide = typeof window !== 'undefined'
  const isLargeFile = file.size > DIRECT_UPLOAD_THRESHOLD

  // On Vercel client-side: large files MUST use direct Blob upload
  // The API route body size limit is 4.5MB even on Vercel Pro,
  // so falling through to API route would always get 413 for large files.
  if (isLargeFile && isClientSide) {
    try {
      const url = await directBlobUpload(filename, file, options)
      return url
    } catch (directError: any) {
      // Don't fall through to API route — it will always 413 for large files on Vercel.
      // Show a specific error about the direct upload failure.
      console.error('Direct Blob upload failed:', directError.message)
      throw new Error(
        `No se pudo subir el archivo (${(file.size / 1024 / 1024).toFixed(1)}MB). ` +
        `Error de carga directa: ${directError.message}. ` +
        'Verificá tu conexión a internet e intentá de nuevo.'
      )
    }
  }

  // Strategy: Upload via /api/upload endpoint (server-side Blob or local filesystem)
  // This only works for files ≤ 4.5MB (within Vercel's body size limit)
  let lastError: any = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const formData = new FormData()
      formData.append('file', file, filename)
      if (options.contentType) {
        formData.append('contentType', options.contentType)
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        if (data.url) {
          return data.url
        }
      }

      const errData = await response.json().catch(() => ({}))
      lastError = new Error(errData.error || `Upload failed (${response.status})`)
    } catch (clientError: any) {
      lastError = clientError
    }

    if (attempt < MAX_RETRIES) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  console.warn('API upload failed after retries, trying server-side fallback:', lastError?.message)

  // Fallback: Server-side upload via /api/upload-server
  // Only for files ≤ 4.5MB (within Vercel body size limit)
  try {
    const formData = new FormData()
    formData.append('file', file, filename)

    const response = await fetch('/api/upload-server', {
      method: 'POST',
      body: formData,
    })

    if (response.ok) {
      const data = await response.json()
      return data.url
    }

    const errData = await response.json().catch(() => ({}))
    throw new Error(errData.error || `Server upload failed (${response.status})`)
  } catch (serverError: any) {
    console.error('Server-side upload also failed:', serverError.message)
    throw new Error(
      `No se pudo subir el archivo. Error: ${serverError.message}. ` +
      'Verificá tu conexión a internet e intentá de nuevo.'
    )
  }
}

/**
 * Direct upload to Vercel Blob from the browser using @vercel/blob/client.
 * The client-side upload() function communicates with /api/upload-token for auth,
 * then uploads directly to Vercel Blob — bypassing the serverless body size limit entirely.
 *
 * This is the ONLY way to upload files > 4.5MB on Vercel, since API routes have
 * a 4.5MB body size limit by default (even on Pro plan).
 */
async function directBlobUpload(
  filename: string,
  file: File | Blob,
  options: {
    contentType?: string
    onUploadProgress?: (progress: { percentage: number }) => void
  } = {}
): Promise<string> {
  const { upload } = await import('@vercel/blob/client')

  // Add unique suffix to filename
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  const lastDot = filename.lastIndexOf('.')
  const uniqueName = lastDot > 0
    ? filename.substring(0, lastDot) + '_' + randomSuffix + filename.substring(lastDot)
    : filename + '_' + randomSuffix

  const result = await upload(uniqueName, file, {
    access: 'public',
    handleUploadUrl: '/api/upload-token',
    contentType: options.contentType || (file instanceof File ? file.type : undefined),
    onUploadProgress: options.onUploadProgress
      ? (event) => {
          options.onUploadProgress!({ percentage: event.percentage })
        }
      : undefined,
  })

  return result.url
}

// ============================================================
// Image resizing utilities
// ============================================================

const MAX_IMAGE_WIDTH = 2400
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024

/**
 * Resize an image file to WebP format, max 2400px width, max 4MB.
 */
export function resizeImageToBlob(
  file: File | Blob,
  maxWidth: number = MAX_IMAGE_WIDTH,
  quality: number = 88
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let width = img.width
      let height = img.height

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('No se pudo crear el contexto del canvas'))
        return
      }

      if (img.width > width * 2) {
        let stepW = width * 2
        let stepH = Math.round((height * stepW) / width)

        const stepCanvas = document.createElement('canvas')
        stepCanvas.width = stepW
        stepCanvas.height = stepH
        const stepCtx = stepCanvas.getContext('2d')!

        stepCtx.fillStyle = '#F3EFF8'
        stepCtx.fillRect(0, 0, stepW, stepH)
        stepCtx.drawImage(img, 0, 0, stepW, stepH)

        ctx.fillStyle = '#F3EFF8'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(stepCanvas, 0, 0, width, height)
      } else {
        ctx.fillStyle = '#F3EFF8'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)
      }

      canvasToBlobWithSizeLimit(canvas, quality, MAX_OUTPUT_BYTES)
        .then(resolve)
        .catch(reject)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Error al leer la imagen'))
    }

    img.src = url
  })
}

function canvasToBlobWithSizeLimit(
  canvas: HTMLCanvasElement,
  startQuality: number,
  maxBytes: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let currentQuality = startQuality
    let format: string = 'image/webp'
    let attempts = 0
    const MAX_ATTEMPTS = 15

    function attempt() {
      attempts++
      if (attempts > MAX_ATTEMPTS) {
        if (format === 'image/webp') {
          format = 'image/jpeg'
          currentQuality = 50
          attempts = 0
          attempt()
          return
        }
        resolve(canvasToBlobRaw(canvas, format, currentQuality))
        return
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            if (format === 'image/webp') {
              format = 'image/jpeg'
              attempt()
              return
            }
            reject(new Error('Error al convertir la imagen'))
            return
          }

          if (blob.size <= maxBytes || currentQuality <= 30) {
            resolve(blob)
            return
          }

          currentQuality = Math.max(30, currentQuality - 5)
          attempt()
        },
        format,
        currentQuality / 100
      )
    }

    attempt()
  })
}

function canvasToBlobRaw(canvas: HTMLCanvasElement, format: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Error al convertir la imagen'))
        else resolve(blob)
      },
      format,
      quality / 100
    )
  })
}

function makeUniqueName(filename: string): string {
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  const lastDot = filename.lastIndexOf('.')
  if (lastDot > 0) {
    return filename.substring(0, lastDot) + '_' + randomSuffix + filename.substring(lastDot)
  }
  return filename + '_' + randomSuffix
}

/**
 * Upload a resized image blob to the server.
 */
export async function uploadResizedImage(file: File | Blob, originalName: string): Promise<string> {
  let blob: Blob
  let uploadName: string

  try {
    blob = await resizeImageToBlob(file)
    const ext = blob.type === 'image/jpeg' ? '.jpg' : '.webp'
    const baseName = originalName.replace(/\.[^.]+$/, ext)
    uploadName = makeUniqueName(baseName)
  } catch (resizeError: any) {
    try {
      blob = await resizeImageToBlob(file, 1600, 75)
      const ext = blob.type === 'image/jpeg' ? '.jpg' : '.webp'
      uploadName = makeUniqueName(originalName.replace(/\.[^.]+$/, ext))
    } catch (resizeError2: any) {
      try {
        blob = await resizeImageToBlob(file, 1200, 65)
        const ext = blob.type === 'image/jpeg' ? '.jpg' : '.webp'
        uploadName = makeUniqueName(originalName.replace(/\.[^.]+$/, ext))
      } catch {
        blob = file
        uploadName = makeUniqueName(originalName)
      }
    }
  }

  const url = await uploadFile(uploadName, blob, {
    contentType: blob.type || 'image/webp',
  })

  return url
}
