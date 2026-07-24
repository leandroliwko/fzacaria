import { cookies } from 'next/headers'

const AUTH_SECRET = 'florencia-zacaria-admin-secret-2024'
const TOKEN_PREFIX = 'fz_admin_'

export function generateToken(email: string): string {
  const payload = JSON.stringify({ email, ts: Date.now(), secret: AUTH_SECRET })
  return Buffer.from(payload).toString('base64')
}

export function validateToken(token: string): { email: string; ts: number } | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const payload = JSON.parse(decoded)
    if (payload.secret !== AUTH_SECRET) return null
    return { email: payload.email, ts: payload.ts }
  } catch {
    return null
  }
}

export async function getAuthStatus(): Promise<{ authenticated: boolean; email?: string }> {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (!token) return { authenticated: false }
  
  const result = validateToken(token)
  if (!result) return { authenticated: false }
  
  return { authenticated: true, email: result.email }
}

export function createTokenCookie(token: string) {
  return {
    name: 'admin_token',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  }
}

export function deleteTokenCookie() {
  return {
    name: 'admin_token',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  }
}
