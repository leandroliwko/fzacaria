import { handleUpload } from '@vercel/blob/client'
import type { HandleUploadBody } from '@vercel/blob/client'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthStatus } from '@/lib/auth'

// Handles client-side Vercel Blob upload requests.
// The browser calls this route to get authorization for direct Blob upload.
// This bypasses the serverless function body size limit entirely.
//
// IMPORTANT: handleUpload() requires the `body` parameter explicitly parsed
// from the request. It does NOT auto-parse from `request` in v2.x.
// The body format from @vercel/blob/client upload() is:
//   { type: "blob.generate-client-token", payload: { pathname, clientPayload, multipart } }

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
  })

  return NextResponse.json(result)
}
