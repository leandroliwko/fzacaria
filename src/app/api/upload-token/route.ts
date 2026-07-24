import { handleUpload } from '@vercel/blob/client'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthStatus } from '@/lib/auth'

// Handles client-side Vercel Blob upload requests.
// The browser calls this route to get authorization for direct Blob upload.
// This bypasses the serverless function body size limit entirely.

export async function POST(request: NextRequest) {
  const auth = await getAuthStatus()
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const result = await handleUpload({
    request,
    token: process.env.BLOB_READ_WRITE_TOKEN!,
    access: 'public',
  })

  return NextResponse.json(result)
}
