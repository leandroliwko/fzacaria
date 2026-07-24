import { NextResponse } from 'next/server'
import { deleteTokenCookie } from '@/lib/auth'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(deleteTokenCookie())
  return response
}
