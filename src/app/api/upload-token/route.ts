import { handleUpload } from '@vercel/blob/client'
import type { HandleUploadBody } from '@vercel/blob/client'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthStatus } from '@/lib/auth'

// Handles client-side Vercel Blob upload requests.
// The browser calls this route to get authorization for direct Blob upload.
// This bypasses the serverless function body size limit entirely.
//
// In @vercel/blob v2.x, handleUpload() requires:
//   1. `body` — parsed from the request explicitly (not auto-parsed)
//   2. `onBeforeGenerateToken` — REQUIRED callback that returns token constraints
//      including maximumSizeInBytes, allowedContentTypes, etc.
// Without these, the function crashes (TypeError: undefined is not a function).

// Maximum video file size: 100MB (Vercel Pro Blob supports up to 500MB)
const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024

// Maximum image file size via direct upload: 4MB
const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024

export async function POST(request: NextRequest) {
  const auth = await getAuthStatus()
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Parse the request body — handleUpload requires this explicitly in v2.x
  const body: HandleUploadBody = await request.json()

  const result = await handleUpload({
    body,
    request,
    token: process.env.BLOB_READ_WRITE_TOKEN!,
    onBeforeGenerateToken: async (pathname, clientPayload, multipart) => {
      // Determine max size based on file type
      const isVideo = pathname.match(/\.(mp4|mov|avi|3gp|3g2|webm|mkv|ts|ogg|ogv|flv|mpeg|mpg)$/i)
      const maximumSizeInBytes = isVideo ? MAX_VIDEO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES

      return {
        maximumSizeInBytes,
        allowedContentTypes: isVideo
          ? ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo',
             'video/3gpp', 'video/3gpp2', 'video/webm', 'video/x-matroska',
             'video/mp2t', 'video/ogg', 'video/x-flv']
          : ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        addRandomSuffix: false, // We already add unique suffixes in upload code
      }
    },
  })

  return NextResponse.json(result)
}
