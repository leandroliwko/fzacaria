// ============================================================
// Pixel Inmobiliario CRM API client
// ============================================================
//
// Reverse-engineered from the official Vue SPA at
// https://pixelinmobiliario.com.ar/crm/.  The CRM exposes a
// Laravel Passport OAuth2 endpoint at /oauth/token and a
// REST API under /api/v1/crm/.  We use the password grant
// (client_id=2, public client_secret extracted from the SPA
// bundle) to obtain an access_token on behalf of the
// inmobiliaria, then proxy requests to the CRM's networking
// endpoints.
//
// Confirmed working endpoints (2026-06-17):
//   POST /oauth/token                                   (password grant)
//   GET  /api/v1/crm/user                               (current user)
//   GET  /api/v1/crm/networking/myNetworks              (my networks)
//   GET  /api/v1/crm/networking/getInmoConnections       (connections)
//   GET  /api/v1/crm/networking/getInmoList?page=&per_page=  (list inmos)
//   POST /api/v1/crm/networking/getSuggestedNetworks    (suggested networks)
//   POST /api/v1/crm/networking/storeNetwork            (create network)
//   POST /api/v1/crm/networking/deleteNetwork           (delete network)
//   POST /api/v1/crm/networking/sendRequestToInmo       (send request)
//   POST /api/v1/crm/networking/actionOnRequest         (accept/reject/cancel)
// ============================================================

import { prisma } from './prisma'

const PIXEL_BASE = 'https://pixelinmobiliario.com.ar'
const OAUTH_TOKEN_URL = `${PIXEL_BASE}/oauth/token`
const API_BASE = `${PIXEL_BASE}/api/v1/crm`

// Public client credentials extracted from the SPA bundle
// (visible to anyone visiting pixelinmobiliario.com.ar).
const CLIENT_ID = 2
const CLIENT_SECRET = 'D8enF6PvCKX85RwmLdXRM1TARPyJwfUatBTeM6oI'

// --------------------------------------------------------------
// Types
// --------------------------------------------------------------
export interface PixelUser {
  id: number
  name: string
  first_name: string
  last_name: string
  realty_name: string
  email: string
  plan: string
  country: string
  state: string
  city: string
  address: string
  mobile: string
  phone: string
  website: string
  instagram_link: string | null
  facebook_link: string | null
  footer_about_us: string | null
}

export interface PixelNetwork {
  id: number
  title: string
  description: string | null
  image: string | null
  user_creator_id: number
  type: string
  extra_data: any
  created_at: string
  updated_at: string
  creator: string
  partners_count: number
  inmos_count: number
  can_edit?: boolean
}

export interface PixelInmo {
  id: number
  name: string
  last_name: string
  email: string
  realty_name: string
  photo: string | null
  city: string
  state: string
  country: string
  website: string
  created_at_connection: string
}

export interface PixelConnection {
  id: number
  user_id_creator: number
  inmo_id: number
  crm_network_id: number
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
  viewed: number
  accepted_date: string | null
  rejected_date: string | null
  creator_message: string
  acceptance_message: string | null
  created_at: string
  updated_at: string
  type: 'send_request' | 'received_request'
  inmo_connection_id: number
  name: string
  last_name: string
  email: string
  realty_name: string
  city: string
  state: string
  country: string
  website: string
  photo: string | null
  creator_name: string
  creator_last_name: string
  creator_email: string
  creator_realty_name: string
  creator_city: string
  creator_state: string
  creator_country: string
  creator_photo: string | null
  creator_website: string
  crm_network_title: string
  can_be_deleted: boolean
  mapped_created_at: string
  mapped_updated_at: string
}

// ============================================================
// Property types (from /api/v1/crm/properties/resource)
// ============================================================
export interface PixelProperty {
  id: number
  title?: string
  description?: string | null
  operation_type?: string // venta | alquiler | temporario | ...
  property_type?: string // casa | departamento | ...
  type?: string // sometimes 'type' instead of 'property_type'
  ad_type?: string
  address?: string | null
  location?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  price?: number | string | null
  currency?: string | null
  bedrooms?: number | null
  bathrooms?: number | null
  toilets?: number | null
  parking?: number | null
  total_area?: number | null
  covered_area?: number | null
  surface_total?: number | null
  surface_covered?: number | null
  images?: Array<{ url?: string; src?: string; path?: string; full_url?: string }> | string | null
  main_image?: string | null
  photos?: Array<any> | null
  status?: string | null
  code?: string | null
  ref_code?: string | null
  ad_id?: number | null
  age?: number | null
  expenses?: number | null
  lat?: number | null
  lng?: number | null
  latitude?: number | null
  longitude?: number | null
  [key: string]: any
}

// --------------------------------------------------------------
// Internal: ensure the table exists (idempotent)
// --------------------------------------------------------------
let tableEnsured = false
async function ensureTable() {
  if (tableEnsured) return
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PixelInmobiliarioToken" (
        "id" TEXT PRIMARY KEY,
        "accessToken" TEXT NOT NULL,
        "refreshToken" TEXT NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "tokenType" TEXT NOT NULL DEFAULT 'Bearer',
        "userId" INTEGER,
        "userName" TEXT NOT NULL DEFAULT '',
        "realtyName" TEXT NOT NULL DEFAULT '',
        "email" TEXT NOT NULL DEFAULT '',
        "plan" TEXT NOT NULL DEFAULT '',
        "city" TEXT NOT NULL DEFAULT '',
        "state" TEXT NOT NULL DEFAULT '',
        "country" TEXT NOT NULL DEFAULT '',
        "phone" TEXT NOT NULL DEFAULT '',
        "website" TEXT NOT NULL DEFAULT '',
        "storedEmail" TEXT NOT NULL DEFAULT '',
        "storedPassword" TEXT NOT NULL DEFAULT '',
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );
    `)
    tableEnsured = true
  } catch (err) {
    console.error('PixelInmobiliarioToken table ensure failed:', err)
    // Ignore — the table may already exist
    tableEnsured = true
  }
}

// --------------------------------------------------------------
// Auth
// --------------------------------------------------------------

interface OAuthResponse {
  token_type: string
  expires_in: number
  access_token: string
  refresh_token: string
}

export async function loginToPixel(email: string, password: string): Promise<{
  user: PixelUser
  tokenRow: any
}> {
  await ensureTable()

  // 1. Get OAuth token
  const oauthRes = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'password',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      username: email,
      password,
      scope: '',
    }),
  })

  if (!oauthRes.ok) {
    const errText = await oauthRes.text()
    let msg = `HTTP ${oauthRes.status}`
    try {
      const errJson = JSON.parse(errText)
      msg = errJson.message || errJson.error_description || errJson.error || msg
    } catch {
      msg = errText || msg
    }
    throw new Error(`Login fallido: ${msg}`)
  }

  const oauth: OAuthResponse = await oauthRes.json()
  const expiresAt = new Date(Date.now() + oauth.expires_in * 1000)

  // 2. Fetch user profile
  const userRes = await fetch(`${API_BASE}/user`, {
    headers: {
      'Authorization': `Bearer ${oauth.access_token}`,
      'Accept': 'application/json',
    },
  })
  if (!userRes.ok) {
    throw new Error(`Login OK pero no se pudo obtener el perfil de usuario (HTTP ${userRes.status})`)
  }
  const user: PixelUser = await userRes.json()

  // 3. Persist token (replace any existing)
  await prisma.pixelInmobiliarioToken.deleteMany({ where: { active: true } }).catch(() => {})
  const tokenRow = await prisma.pixelInmobiliarioToken.create({
    data: {
      accessToken: oauth.access_token,
      refreshToken: oauth.refresh_token,
      expiresAt,
      tokenType: oauth.token_type,
      userId: user.id,
      userName: user.name,
      realtyName: user.realty_name,
      email: user.email,
      plan: user.plan,
      city: user.city,
      state: user.state,
      country: user.country,
      phone: user.phone || user.mobile || '',
      website: user.website || '',
      storedEmail: email,
      storedPassword: password,
      active: true,
    },
  })

  return { user, tokenRow }
}

export async function logoutFromPixel(): Promise<void> {
  await ensureTable()
  await prisma.pixelInmobiliarioToken.deleteMany({ where: { active: true } }).catch(() => {})
}

export async function getPixelStatus(): Promise<{
  authenticated: boolean
  user?: Partial<PixelUser>
  expiresAt?: string
  storedEmail?: string
}> {
  await ensureTable()
  const row = await prisma.pixelInmobiliarioToken.findFirst({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  })
  if (!row) return { authenticated: false }
  return {
    authenticated: true,
    user: {
      id: row.userId ?? undefined,
      name: row.userName,
      realty_name: row.realtyName,
      email: row.email,
      plan: row.plan,
      city: row.city,
      state: row.state,
      country: row.country,
      phone: row.phone,
      website: row.website,
    },
    expiresAt: row.expiresAt.toISOString(),
    storedEmail: row.storedEmail,
  }
}

// --------------------------------------------------------------
// Internal: get a valid access token (refresh if needed)
// --------------------------------------------------------------
async function getValidAccessToken(): Promise<string> {
  await ensureTable()
  const row = await prisma.pixelInmobiliarioToken.findFirst({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  })
  if (!row) {
    throw new Error('No hay sesión activa en Pixel Inmobiliario. Iniciá sesión primero.')
  }

  // If token expires in less than 1 hour, refresh it
  const msUntilExpiry = row.expiresAt.getTime() - Date.now()
  if (msUntilExpiry < 60 * 60 * 1000) {
    try {
      const refreshed = await refreshPixelToken(row.refreshToken, row.storedEmail, row.storedPassword)
      await prisma.pixelInmobiliarioToken.update({
        where: { id: row.id },
        data: {
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token,
          expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
        },
      })
      return refreshed.access_token
    } catch (err) {
      // If refresh fails, try a fresh login with stored credentials
      if (row.storedEmail && row.storedPassword) {
        try {
          await loginToPixel(row.storedEmail, row.storedPassword)
          return (await prisma.pixelInmobiliarioToken.findFirst({
            where: { active: true },
            orderBy: { createdAt: 'desc' },
          }))!.accessToken
        } catch (loginErr) {
          console.error('Pixel re-login failed:', loginErr)
          throw new Error('Sesión expirada y no se pudo renovar. Iniciá sesión nuevamente.')
        }
      }
      throw err
    }
  }

  return row.accessToken
}

async function refreshPixelToken(refreshToken: string, email: string, password: string): Promise<OAuthResponse> {
  // Try refresh_token grant first
  try {
    const res = await fetch(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refreshToken,
        scope: '',
      }),
    })
    if (res.ok) return await res.json()
  } catch {
    // fall through to password re-login
  }
  // Fallback: re-login with stored credentials
  if (email && password) {
    return await reloginWithPassword(email, password)
  }
  throw new Error('No se pudo refrescar el token')
}

async function reloginWithPassword(email: string, password: string): Promise<OAuthResponse> {
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      grant_type: 'password',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      username: email,
      password,
      scope: '',
    }),
  })
  if (!res.ok) throw new Error(`Re-login fallido: HTTP ${res.status}`)
  return await res.json()
}

// Public alias for diagnostic/probe endpoints (NEVER use in business logic)
export async function getValidAccessTokenForProbes(): Promise<string> {
  return await getValidAccessToken()
}

// --------------------------------------------------------------
// API helpers
// --------------------------------------------------------------
async function pixelGet<T = any>(path: string, params?: Record<string, string | number>): Promise<T> {
  const token = await getValidAccessToken()
  const url = new URL(`${API_BASE}${path}`)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, String(v))
    }
  }
  const res = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Pixel API ${path} falló: HTTP ${res.status} ${text.slice(0, 200)}`)
  }
  return await res.json()
}

async function pixelPost<T = any>(path: string, body: any = {}): Promise<T> {
  const token = await getValidAccessToken()
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  const text = await res.text()
  let json: any
  try { json = JSON.parse(text) } catch { json = { raw: text } }
  if (!res.ok) {
    const msg = json.message || json.error || json.msg || `HTTP ${res.status}`
    throw new Error(`Pixel API ${path} falló: ${msg}`)
  }
  return json as T
}

// --------------------------------------------------------------
// Public API methods
// --------------------------------------------------------------

export async function getMyNetworks(): Promise<PixelNetwork[]> {
  const data = await pixelGet<{ networks: PixelNetwork[] }>('/networking/myNetworks')
  return data.networks || []
}

export async function getSuggestedNetworks(page = 1, perPage = 10): Promise<PixelNetwork[]> {
  const data = await pixelPost<{ networks: PixelNetwork[] }>('/networking/getSuggestedNetworks', {
    section: 'home',
    moreParamsTop: { page, perPage },
  })
  return data.networks || []
}

export async function createNetwork(payload: {
  title: string
  description?: string
  type?: 'public' | 'private'
}): Promise<any> {
  return await pixelPost('/networking/storeNetwork', {
    title: payload.title,
    description: payload.description || '',
    type: payload.type || 'public',
  })
}

export async function deleteNetwork(networkId: number): Promise<any> {
  return await pixelPost('/networking/deleteNetwork', { network_id: networkId })
}

export async function getConnections(): Promise<{
  pending: PixelConnection[]
  accepted: PixelConnection[]
  rejected: PixelConnection[]
  total: number
}> {
  const data = await pixelGet<{ inmo_connections: { data: PixelConnection[]; total: number } }>(
    '/networking/getInmoConnections'
  )
  const all = data.inmo_connections?.data || []
  return {
    pending: all.filter((c) => c.status === 'pending'),
    accepted: all.filter((c) => c.status === 'accepted'),
    rejected: all.filter((c) => c.status === 'rejected'),
    total: data.inmo_connections?.total || all.length,
  }
}

export async function actionOnRequest(connectionId: number, action: 'accepted' | 'rejected' | 'cancelled'): Promise<any> {
  return await pixelPost('/networking/actionOnRequest', {
    inmo_connection_id: connectionId,
    action,
  })
}

export async function sendConnectionRequest(payload: {
  selected_inmo_id: number
  network_id: number
  message: string
}): Promise<any> {
  return await pixelPost('/networking/sendRequestToInmo', payload)
}

export async function getInmoList(page = 1, perPage = 20): Promise<{
  data: PixelInmo[]
  total: number
  currentPage: number
  lastPage: number
}> {
  const data = await pixelGet<{ data: PixelInmo[]; total: number; current_page: number; last_page: number }>(
    '/networking/getInmoList',
    { page, per_page: perPage }
  )
  return {
    data: data.data || [],
    total: data.total || 0,
    currentPage: data.current_page || 1,
    lastPage: data.last_page || 1,
  }
}

// ============================================================
// Properties (CRM inventory)
// ============================================================
//
// Endpoint discovered in SPA chunk 154.1ca3fd72.js (route: /panel/propiedades/listado)
//   GET /api/v1/crm/properties/resource?page=1&per_page=20
//
// Response shape (paginated Laravel collection):
//   {
//     data: PixelProperty[],
//     total, current_page, last_page, per_page, ...
//   }
//
// Note: The CRM uses a generic "reusable-table" component whose payload
// may include additional filters; we keep the call simple — just pagination.

export async function getMyProperties(page = 1, perPage = 20): Promise<{
  data: PixelProperty[]
  total: number
  currentPage: number
  lastPage: number
}> {
  const data = await pixelGet<{
    data: PixelProperty[]
    total: number
    current_page: number
    last_page: number
    per_page: number
  }>('/properties/resource', { page, per_page: perPage })

  return {
    data: Array.isArray(data.data) ? data.data : [],
    total: data.total ?? data.data?.length ?? 0,
    currentPage: data.current_page ?? page,
    lastPage: data.last_page ?? 1,
  }
}

export async function getPropertyById(id: number): Promise<PixelProperty> {
  return await pixelGet<PixelProperty>(`/properties/resource/${id}`)
}
