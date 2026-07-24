'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LogIn, LogOut, RefreshCw, Plus, Trash2, Users, Building2, Mail, Globe,
  Phone, MapPin, Clock, Check, X, Send, AlertCircle, Info, ExternalLink,
  Network as NetworkIcon, Search, ChevronLeft, ChevronRight, Loader2,
  ShieldCheck, Sparkles, UserCircle, ArrowRight, Download, FileSpreadsheet,
  Home as HomeIcon, Image as ImageIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ============================================================
// Types
// ============================================================
interface PixelUser {
  id?: number
  name: string
  realty_name: string
  email: string
  plan: string
  city: string
  state: string
  country: string
  phone: string
  website: string
}

interface PixelNetwork {
  id: number
  title: string
  description: string | null
  image: string | null
  user_creator_id: number
  type: string
  created_at: string
  updated_at: string
  creator: string
  partners_count: number
  inmos_count: number
  can_edit?: boolean
}

interface PixelInmo {
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

interface PixelProperty {
  id: number
  title?: string
  description?: string | null
  operation_type?: string
  property_type?: string
  type?: string
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
  total_area?: number | null
  covered_area?: number | null
  surface_total?: number | null
  surface_covered?: number | null
  images?: any
  main_image?: string | null
  photos?: any[] | null
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

interface PixelConnection {
  id: number
  inmo_connection_id: number
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
  creator_message: string
  type: 'send_request' | 'received_request'
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
  creator_realty_name: string
  creator_city: string
  creator_state: string
  creator_website: string
  crm_network_title: string
  mapped_created_at: string
  can_be_deleted: boolean
}

type Subtab = 'overview' | 'networks' | 'connections' | 'explore' | 'suggested' | 'properties'

// ============================================================
// Main component
// ============================================================
export default function PixelTab() {
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [user, setUser] = useState<PixelUser | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)

  // Login form
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  // Data
  const [networks, setNetworks] = useState<PixelNetwork[]>([])
  const [connections, setConnections] = useState<{
    pending: PixelConnection[]
    accepted: PixelConnection[]
    rejected: PixelConnection[]
    total: number
  }>({ pending: [], accepted: [], rejected: [], total: 0 })
  const [suggested, setSuggested] = useState<PixelNetwork[]>([])
  const [inmos, setInmos] = useState<{ data: PixelInmo[]; total: number; currentPage: number; lastPage: number }>({
    data: [], total: 0, currentPage: 1, lastPage: 1,
  })

  // Subtab
  const [subtab, setSubtab] = useState<Subtab>('overview')

  // Explore (inmo list) state
  const [explorePage, setExplorePage] = useState(1)
  const [exploreSearch, setExploreSearch] = useState('')

  // Properties (own CRM inventory) state
  const [properties, setProperties] = useState<PixelProperty[]>([])
  const [propertiesMeta, setPropertiesMeta] = useState<{ total: number; currentPage: number; lastPage: number }>({ total: 0, currentPage: 1, lastPage: 1 })
  const [propertiesPage, setPropertiesPage] = useState(1)
  const [propertiesLoading, setPropertiesLoading] = useState(false)
  const [propertiesSearch, setPropertiesSearch] = useState('')
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<number>>(new Set())
  const [importing, setImporting] = useState(false)
  const [refreshingMedia, setRefreshingMedia] = useState(false)
  const [refreshMediaResult, setRefreshMediaResult] = useState<null | {
    pixelTotal: number
    localMatched: number
    updated: number
    notFound: number
    errors: any[]
  }>(null)
  const [importResult, setImportResult] = useState<null | { imported: number; skipped: number; errors: any[] }>(null)

  // Fetchers
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/pixelinmobiliario/auth/status', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setAuthed(!!data.authenticated)
        setUser(data.user || null)
        setExpiresAt(data.expiresAt || null)
        if (data.storedEmail && !loginEmail) setLoginEmail(data.storedEmail)
      }
    } catch (err) {
      console.error('fetchStatus error:', err)
    }
  }, [loginEmail])

  const fetchNetworks = useCallback(async () => {
    try {
      const res = await fetch('/api/pixelinmobiliario/networks', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setNetworks(data.networks || [])
      }
    } catch (err) {
      console.error('fetchNetworks error:', err)
    }
  }, [])

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/pixelinmobiliario/connections', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setConnections({
          pending: data.pending || [],
          accepted: data.accepted || [],
          rejected: data.rejected || [],
          total: data.total || 0,
        })
      }
    } catch (err) {
      console.error('fetchConnections error:', err)
    }
  }, [])

  const fetchSuggested = useCallback(async () => {
    try {
      const res = await fetch('/api/pixelinmobiliario/suggested?page=1&per_page=10', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setSuggested(data.networks || [])
      }
    } catch (err) {
      console.error('fetchSuggested error:', err)
    }
  }, [])

  const fetchInmos = useCallback(async (page = 1) => {
    try {
      const res = await fetch(`/api/pixelinmobiliario/inmos?page=${page}&per_page=20`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setInmos(data)
      }
    } catch (err) {
      console.error('fetchInmos error:', err)
    }
  }, [])

  const fetchProperties = useCallback(async (page = 1, perPage = 20) => {
    setPropertiesLoading(true)
    try {
      const res = await fetch(`/api/pixelinmobiliario/properties?page=${page}&per_page=${perPage}`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setProperties(Array.isArray(data.data) ? data.data : [])
        setPropertiesMeta({
          total: data.total || 0,
          currentPage: data.currentPage || 1,
          lastPage: data.lastPage || 1,
        })
        setPropertiesPage(data.currentPage || 1)
      }
    } catch (err) {
      console.error('fetchProperties error:', err)
      toast.error('Error al cargar propiedades de Pixel')
    } finally {
      setPropertiesLoading(false)
    }
  }, [])

  const handleImportProperties = useCallback(async () => {
    if (selectedPropertyIds.size === 0) {
      toast.error('Seleccioná al menos una propiedad para importar')
      return
    }
    setImporting(true)
    setImportResult(null)
    try {
      const res = await fetch('/api/pixelinmobiliario/properties/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyIds: Array.from(selectedPropertyIds) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al importar')
      setImportResult({ imported: data.imported, skipped: data.skipped, errors: data.errors || [] })
      if (data.imported > 0) {
        toast.success(`${data.imported} propiedad${data.imported === 1 ? '' : 'es'} importada${data.imported === 1 ? '' : 's'} correctamente`)
      }
      if (data.skipped > 0) {
        toast.info(`${data.skipped} propiedad${data.skipped === 1 ? '' : 'es'} ya existían localmente (omitidas)`)
      }
      if ((data.errors || []).length > 0) {
        toast.error(`${data.errors.length} error(es) durante la importación`)
      }
      // Clear selection after import
      setSelectedPropertyIds(new Set())
    } catch (err: any) {
      toast.error(err.message || 'Error al importar propiedades')
    } finally {
      setImporting(false)
    }
  }, [selectedPropertyIds])

  const handleImportAllProperties = useCallback(async () => {
    setImporting(true)
    setImportResult(null)
    try {
      const res = await fetch('/api/pixelinmobiliario/properties/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al importar')
      setImportResult({ imported: data.imported, skipped: data.skipped, errors: data.errors || [] })
      if (data.imported > 0) {
        toast.success(`${data.imported} propiedad${data.imported === 1 ? '' : 'es'} importada${data.imported === 1 ? '' : 's'} correctamente`)
      } else {
        toast.info('No se importaron propiedades nuevas (ya existían localmente)')
      }
      if (data.skipped > 0) {
        toast.info(`${data.skipped} propiedad${data.skipped === 1 ? '' : 'es'} ya existían localmente (omitidas)`)
      }
      if ((data.errors || []).length > 0) {
        toast.error(`${data.errors.length} error(es) durante la importación`)
      }
      setSelectedPropertyIds(new Set())
    } catch (err: any) {
      toast.error(err.message || 'Error al importar propiedades')
    } finally {
      setImporting(false)
    }
  }, [])

  // Refresh media (image + video) for already-imported properties.
  // Used when the original import didn't pick up images because the
  // CRM API doesn't expose an `images` array — only `main_image_thumb`
  // and `video_url`.
  const handleRefreshMedia = useCallback(async () => {
    setRefreshingMedia(true)
    setRefreshMediaResult(null)
    try {
      const res = await fetch('/api/pixelinmobiliario/properties/refresh-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al refrescar medios')
      setRefreshMediaResult({
        pixelTotal: data.pixelTotal ?? 0,
        localMatched: data.localMatched ?? 0,
        updated: data.updated ?? 0,
        notFound: data.notFound ?? 0,
        errors: data.errors || [],
      })
      if (data.updated > 0) {
        toast.success(`${data.updated} propiedad${data.updated === 1 ? '' : 'es'} actualizada${data.updated === 1 ? '' : 's'} con foto/video`)
      } else {
        toast.info('No había propiedades locales para actualizar (o ya tenían medios)')
      }
      if ((data.errors || []).length > 0) {
        toast.error(`${data.errors.length} error(es) durante la actualización`)
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al refrescar medios')
    } finally {
      setRefreshingMedia(false)
    }
  }, [])

  const togglePropertySelection = useCallback((id: number) => {
    setSelectedPropertyIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const syncAll = useCallback(async () => {
    setSyncing(true)
    await Promise.all([
      fetchStatus(),
      fetchNetworks(),
      fetchConnections(),
      fetchSuggested(),
      fetchInmos(explorePage),
    ])
    setSyncing(false)
    setLoading(false)
  }, [fetchStatus, fetchNetworks, fetchConnections, fetchSuggested, fetchInmos, explorePage])

  useEffect(() => {
    syncAll()
    const handleFocus = () => syncAll()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [syncAll])

  // Reload inmos when page changes
  useEffect(() => {
    if (authed) fetchInmos(explorePage)
  }, [explorePage, authed, fetchInmos])

  // Lazy-load properties when the "Propiedades" subtab is activated
  useEffect(() => {
    if (authed && subtab === 'properties' && properties.length === 0 && !propertiesLoading) {
      fetchProperties(1)
    }
  }, [authed, subtab, properties.length, propertiesLoading, fetchProperties])

  // -----------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!loginEmail || !loginPassword) {
      toast.error('Ingresá email y contraseña')
      return
    }
    setLoggingIn(true)
    try {
      const res = await fetch('/api/pixelinmobiliario/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Sesión iniciada como ${data.user?.realty_name || data.user?.name}`)
        await syncAll()
      } else {
        toast.error(data.error || 'Error al iniciar sesión')
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`)
    } finally {
      setLoggingIn(false)
    }
  }

  async function handleLogout() {
    if (!confirm('¿Cerrar sesión en Pixel Inmobiliario?')) return
    try {
      const res = await fetch('/api/pixelinmobiliario/auth/logout', { method: 'POST' })
      if (res.ok) {
        toast.success('Sesión cerrada')
        setAuthed(false)
        setUser(null)
        setNetworks([])
        setConnections({ pending: [], accepted: [], rejected: [], total: 0 })
        setSuggested([])
        setInmos({ data: [], total: 0, currentPage: 1, lastPage: 1 })
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`)
    }
  }

  async function handleCreateNetwork() {
    const title = prompt('Nombre de la nueva red:')
    if (!title) return
    const description = prompt('Descripción (opcional):') || ''
    try {
      const res = await fetch('/api/pixelinmobiliario/networks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, type: 'public' }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Red "${title}" creada`)
        await fetchNetworks()
      } else {
        toast.error(data.error || 'Error al crear la red')
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`)
    }
  }

  async function handleDeleteNetwork(id: number, title: string) {
    if (!confirm(`¿Eliminar la red "${title}"? Esta acción no se puede deshacer.`)) return
    try {
      const res = await fetch(`/api/pixelinmobiliario/networks?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        toast.success('Red eliminada')
        await fetchNetworks()
      } else {
        toast.error(data.error || 'Error al eliminar la red')
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`)
    }
  }

  async function handleActionConnection(connectionId: number, action: 'accepted' | 'rejected' | 'cancelled') {
    const labels = {
      accepted: 'aceptar',
      rejected: 'rechazar',
      cancelled: 'cancelar',
    }
    if (!confirm(`¿Confirmás ${labels[action]} esta solicitud de conexión?`)) return
    try {
      const res = await fetch('/api/pixelinmobiliario/connections/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId, action }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Solicitud ${action === 'accepted' ? 'aceptada' : action === 'rejected' ? 'rechazada' : 'cancelada'}`)
        await fetchConnections()
      } else {
        toast.error(data.error || 'Error al procesar la solicitud')
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`)
    }
  }

  async function handleSendRequest(inmo: PixelInmo) {
    if (networks.length === 0) {
      toast.error('Primero creá o unite a una red antes de enviar solicitudes')
      return
    }
    const options = networks.map((n, i) => `${i + 1}. ${n.title} (${n.inmos_count} inmos)`).join('\n')
    const choice = prompt(`¿En qué red querés conectar con ${inmo.realty_name}?\n\n${options}\n\nIngresá el número:`)
    if (!choice) return
    const idx = parseInt(choice, 10) - 1
    if (isNaN(idx) || idx < 0 || idx >= networks.length) {
      toast.error('Selección inválida')
      return
    }
    const network = networks[idx]
    const message = prompt(`Mensaje de presentación (opcional):`) || ''
    try {
      const res = await fetch('/api/pixelinmobiliario/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selected_inmo_id: inmo.id,
          network_id: network.id,
          message,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Solicitud enviada a ${inmo.realty_name} para unirse a "${network.title}"`)
        await fetchConnections()
      } else {
        toast.error(data.error || 'Error al enviar la solicitud')
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`)
    }
  }

  // -----------------------------------------------------------
  // CSV Export — Connections + Inmos
  // -----------------------------------------------------------
  function downloadCsv(filename: string, rows: string[][]) {
    if (rows.length === 0) {
      toast.error('No hay datos para exportar')
      return
    }
    const escape = (v: any) => {
      const s = String(v ?? '')
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    }
    const csv = rows.map((r) => r.map(escape).join(',')).join('\r\n')
    // BOM for Excel UTF-8 compatibility
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function exportConnectionsCsv() {
    const all = [
      ...connections.accepted,
      ...connections.pending,
      ...connections.rejected,
    ]
    const rows: string[][] = [
      [
        'Tipo', 'Estado', 'Inmobiliaria', 'Contacto', 'Email', 'Ciudad',
        'Provincia', 'País', 'Website', 'Red', 'Mensaje', 'Fecha',
      ],
    ]
    for (const c of all) {
      rows.push([
        c.type === 'received_request' ? 'Recibida' : 'Enviada',
        c.status,
        c.realty_name,
        `${c.name} ${c.last_name}`,
        c.email,
        c.city,
        c.state,
        c.country,
        c.website,
        c.crm_network_title,
        c.creator_message,
        c.mapped_created_at,
      ])
    }
    const date = new Date().toISOString().slice(0, 10)
    downloadCsv(`pixel-conexiones-${date}.csv`, rows)
    toast.success(`${all.length} conexiones exportadas`)
  }

  function exportInmosCsv() {
    const rows: string[][] = [
      ['Inmobiliaria', 'Contacto', 'Email', 'Ciudad', 'Provincia', 'País', 'Website', 'Conectado el'],
    ]
    for (const inmo of inmos.data) {
      rows.push([
        inmo.realty_name,
        `${inmo.name} ${inmo.last_name}`,
        inmo.email,
        inmo.city,
        inmo.state,
        inmo.country,
        inmo.website,
        inmo.created_at_connection,
      ])
    }
    const date = new Date().toISOString().slice(0, 10)
    downloadCsv(`pixel-inmobiliarias-p${inmos.currentPage}-${date}.csv`, rows)
    toast.success(`${inmos.data.length} inmobiliarias exportadas (página ${inmos.currentPage} de ${inmos.lastPage})`)
  }

  function exportNetworksCsv() {
    const rows: string[][] = [
      ['Red', 'Tipo', 'Creador', 'Socios', 'Inmobiliarias', 'Creada el'],
    ]
    for (const n of networks) {
      rows.push([
        n.title,
        n.type,
        n.creator,
        String(n.partners_count),
        String(n.inmos_count),
        new Date(n.created_at).toLocaleDateString('es-AR'),
      ])
    }
    const date = new Date().toISOString().slice(0, 10)
    downloadCsv(`pixel-redes-${date}.csv`, rows)
    toast.success(`${networks.length} redes exportadas`)
  }

  function exportAllContactsCsv() {
    // Combine accepted connections + all inmos from current page
    const rows: string[][] = [
      ['Origen', 'Inmobiliaria', 'Contacto', 'Email', 'Teléfono', 'Ciudad', 'Provincia', 'País', 'Website', 'Red', 'Estado'],
    ]
    // Accepted connections first
    for (const c of connections.accepted) {
      rows.push([
        'Conexión aceptada',
        c.realty_name,
        `${c.name} ${c.last_name}`,
        c.email,
        '',
        c.city,
        c.state,
        c.country,
        c.website,
        c.crm_network_title,
        'aceptada',
      ])
    }
    // Pending connections
    for (const c of connections.pending) {
      rows.push([
        'Conexión pendiente',
        c.realty_name,
        `${c.name} ${c.last_name}`,
        c.email,
        '',
        c.city,
        c.state,
        c.country,
        c.website,
        c.crm_network_title,
        c.status,
      ])
    }
    // Explored inmos (de-duplicated by email)
    const seenEmails = new Set(rows.slice(1).map((r) => r[3].toLowerCase()))
    for (const inmo of inmos.data) {
      const email = (inmo.email || '').toLowerCase()
      if (email && seenEmails.has(email)) continue
      seenEmails.add(email)
      rows.push([
        'Inmobiliaria registrada',
        inmo.realty_name,
        `${inmo.name} ${inmo.last_name}`,
        inmo.email,
        '',
        inmo.city,
        inmo.state,
        inmo.country,
        inmo.website,
        '',
        'disponible',
      ])
    }
    const date = new Date().toISOString().slice(0, 10)
    downloadCsv(`pixel-contactos-${date}.csv`, rows)
    toast.success(`${rows.length - 1} contactos exportados`)
  }

  // Open the Pixel CRM external page to view an inmo's properties
  function viewInmoPropertiesOnPixel(inmoId: number, inmoName: string) {
    // The Pixel CRM SPA route for viewing properties of a specific inmo in a network
    const url = `https://pixelinmobiliario.com.ar/crm/panel/networking/propiedades-red?inmo_id=${inmoId}`
    window.open(url, '_blank', 'noopener,noreferrer')
    toast.info(`Abriendo propiedades de ${inmoName} en Pixel Inmobiliario`)
  }

  function viewInmoPropertiesByConnection(conn: PixelConnection) {
    // For accepted connections, navigate to the network properties page filtered by this inmo
    const url = `https://pixelinmobiliario.com.ar/crm/panel/networking/propiedades-red?inmo_id=${conn.inmo_connection_id}&network=${encodeURIComponent(conn.crm_network_title)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    toast.info(`Abriendo propiedades de ${conn.realty_name} en Pixel Inmobiliario`)
  }

  // -----------------------------------------------------------
  // Render
  // -----------------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-navy border-t-gold rounded-full animate-spin" />
      </div>
    )
  }

  if (!authed) {
    return <LoginCard
      email={loginEmail}
      password={loginPassword}
      onEmailChange={setLoginEmail}
      onPasswordChange={setLoginPassword}
      onSubmit={handleLogin}
      loading={loggingIn}
    />
  }

  const subtabs: { key: Subtab; label: string; icon: typeof Info; badge?: number }[] = [
    { key: 'overview', label: 'Resumen', icon: Info },
    { key: 'networks', label: 'Mis Redes', icon: NetworkIcon, badge: networks.length },
    { key: 'connections', label: 'Solicitudes', icon: Users, badge: connections.pending.length || undefined },
    { key: 'explore', label: 'Explorar Inmos', icon: Search },
    { key: 'suggested', label: 'Redes Sugeridas', icon: Sparkles, badge: suggested.length || undefined },
    { key: 'properties', label: 'Propiedades', icon: HomeIcon },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Header — Pixel Inmobiliario user banner */}
      <Card className="overflow-hidden border-2" style={{ borderColor: '#abd305' }}>
        <div className="h-1.5" style={{ backgroundColor: '#abd305' }} />
        <CardContent className="pt-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0"
                style={{ backgroundColor: '#abd305' }}
              >
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-navy truncate">{user?.realty_name || user?.name}</h3>
                  <Badge variant="outline" className="text-[10px]" style={{ borderColor: '#abd305', color: '#5d7c00' }}>
                    {user?.plan || 'Plan'}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1" />
                    Conectado
                  </Badge>
                </div>
                <p className="text-xs text-navy-light flex items-center gap-2 flex-wrap mt-0.5">
                  <Mail className="w-3 h-3" />
                  {user?.email}
                  {user?.phone && (
                    <>
                      <Phone className="w-3 h-3 ml-2" />
                      {user.phone}
                    </>
                  )}
                  {user?.city && (
                    <>
                      <MapPin className="w-3 h-3 ml-2" />
                      {user.city}, {user.state}, {user.country}
                    </>
                  )}
                </p>
                {user?.website && (
                  <a
                    href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <Globe className="w-3 h-3" />
                    {user.website}
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={exportAllContactsCsv}
                className="text-green-700 border-green-300 hover:bg-green-50"
                title="Exportar todos los contactos a CSV"
              >
                <Download className="w-4 h-4 mr-1" />
                Exportar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={syncAll}
                disabled={syncing}
                className="text-navy border-navy/20"
              >
                <RefreshCw className={cn('w-4 h-4', syncing && 'animate-spin')} />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleLogout}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Cerrar sesión
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subtabs */}
      <div className="flex gap-1 border-b border-lavender/40 overflow-x-auto">
        {subtabs.map((tab) => {
          const Icon = tab.icon
          const active = subtab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setSubtab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                active
                  ? 'border-gold text-navy'
                  : 'border-transparent text-navy-light hover:text-navy hover:bg-soft/50'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.badge != null && tab.badge > 0 && (
                <span className={cn(
                  'ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  active ? 'bg-gold text-white' : 'bg-navy/10 text-navy'
                )}>
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {subtab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatBox label="Mis redes" value={networks.length} icon={<NetworkIcon className="w-5 h-5" />} color="navy" />
              <StatBox label="Conexiones" value={connections.total} icon={<Users className="w-5 h-5" />} color="green" />
              <StatBox label="Pendientes" value={connections.pending.length} icon={<Clock className="w-5 h-5" />} color="amber" />
              <StatBox label="Aceptadas" value={connections.accepted.length} icon={<Check className="w-5 h-5" />} color="green" />
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <ActionCard
                title="Crear nueva red"
                desc="Armá tu propia red inter-agencias para compartir propiedades"
                icon={<Plus className="w-5 h-5" />}
                onClick={handleCreateNetwork}
              />
              <ActionCard
                title="Explorar inmobiliarias"
                desc={`${inmos.total} inmobiliarias registradas disponibles para conectar`}
                icon={<Search className="w-5 h-5" />}
                onClick={() => setSubtab('explore')}
              />
              <ActionCard
                title="Ver redes sugeridas"
                desc="Redes públicas de otras inmobiliarias que podrían interesarte"
                icon={<Sparkles className="w-5 h-5" />}
                onClick={() => setSubtab('suggested')}
              />
            </div>

            {/* Export & tools */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-green-600" />
                  Exportación y herramientas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-navy-light mb-3">
                  Descargá tus contactos y redes en formato CSV (compatible con Excel y Google Sheets).
                  Para ver propiedades compartidas por una inmo conectada, usá el botón "Ver propiedades" en la lista de conexiones aceptadas.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportAllContactsCsv}
                    className="text-green-700 border-green-300 hover:bg-green-50 justify-start"
                  >
                    <Download className="w-4 h-4 mr-2 flex-shrink-0" />
                    <div className="text-left">
                      <div className="text-xs font-semibold">Todos los contactos</div>
                      <div className="text-[10px] opacity-70">
                        {connections.accepted.length + connections.pending.length + inmos.data.length} registros
                      </div>
                    </div>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportConnectionsCsv}
                    className="text-navy border-navy/20 hover:bg-soft/50 justify-start"
                    disabled={connections.total === 0}
                  >
                    <Users className="w-4 h-4 mr-2 flex-shrink-0" />
                    <div className="text-left">
                      <div className="text-xs font-semibold">Solo conexiones</div>
                      <div className="text-[10px] opacity-70">
                        {connections.total} solicitudes
                      </div>
                    </div>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportInmosCsv}
                    className="text-navy border-navy/20 hover:bg-soft/50 justify-start"
                    disabled={inmos.data.length === 0}
                  >
                    <Building2 className="w-4 h-4 mr-2 flex-shrink-0" />
                    <div className="text-left">
                      <div className="text-xs font-semibold">Inmobiliarias (página actual)</div>
                      <div className="text-[10px] opacity-70">
                        {inmos.data.length} de {inmos.total}
                      </div>
                    </div>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportNetworksCsv}
                    className="text-navy border-navy/20 hover:bg-soft/50 justify-start"
                    disabled={networks.length === 0}
                  >
                    <NetworkIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                    <div className="text-left">
                      <div className="text-xs font-semibold">Mis redes</div>
                      <div className="text-[10px] opacity-70">
                        {networks.length} redes
                      </div>
                    </div>
                  </Button>
                </div>
                <div className="mt-3 pt-3 border-t border-lavender/30 text-[11px] text-navy-light flex items-center gap-2">
                  <HomeIcon className="w-3 h-3 text-gold" />
                  Para ver propiedades compartidas: abrí "Solicitudes" → sección "Aceptadas" → botón "Ver propiedades" en cada conexión.
                </div>
              </CardContent>
            </Card>

            {/* Recent pending connections preview */}
            {connections.pending.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    Solicitudes pendientes ({connections.pending.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {connections.pending.slice(0, 3).map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 text-sm border-b border-lavender/30 pb-2 last:border-0">
                      <div className="min-w-0">
                        <p className="font-medium text-navy truncate">{c.realty_name}</p>
                        <p className="text-xs text-navy-light truncate">{c.city}, {c.state} — red: {c.crm_network_title}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setSubtab('connections')} className="text-xs">
                        Ver
                        <ArrowRight />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {subtab === 'networks' && (
          <motion.div key="networks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm text-navy-light">Tus redes inter-agencias en Pixel Inmobiliario</p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={exportNetworksCsv}
                  disabled={networks.length === 0}
                  className="text-green-700 border-green-300 hover:bg-green-50"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Exportar
                </Button>
                <Button size="sm" onClick={handleCreateNetwork} className="bg-gold hover:bg-gold-dark text-white">
                  <Plus className="w-4 h-4 mr-1" />
                  Nueva red
                </Button>
              </div>
            </div>
            {networks.length === 0 ? (
              <Card className="border-2 border-dashed border-lavender">
                <CardContent className="pt-10 pb-10 text-center">
                  <NetworkIcon className="w-12 h-12 text-navy-light mx-auto mb-3" />
                  <p className="text-sm text-navy-light">Todavía no tenés redes. Creá tu primera red para empezar a compartir propiedades.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {networks.map((n) => (
                  <Card key={n.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-5">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-navy truncate">{n.title}</h3>
                          <p className="text-xs text-navy-light">Creada por: {n.creator}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {n.type}
                        </Badge>
                      </div>
                      {n.description && (
                        <p className="text-sm text-navy-light line-clamp-2 mb-2">{n.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-navy-light mb-3">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {n.partners_count} socios
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {n.inmos_count} inmobiliarias
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(n.created_at).toLocaleDateString('es-AR')}
                        </span>
                      </div>
                      {n.can_edit && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteNetwork(n.id, n.title)}
                          className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Eliminar
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {subtab === 'connections' && (
          <motion.div key="connections" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
            <div className="flex items-center justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={exportConnectionsCsv}
                disabled={connections.total === 0}
                className="text-green-700 border-green-300 hover:bg-green-50"
              >
                <Download className="w-4 h-4 mr-1" />
                Exportar conexiones a CSV
              </Button>
            </div>
            <ConnectionsSection
              title="Pendientes"
              icon={<Clock className="w-4 h-4 text-amber-500" />}
              items={connections.pending}
              empty="No hay solicitudes pendientes"
              onAction={handleActionConnection}
            />
            <ConnectionsSection
              title="Aceptadas"
              icon={<Check className="w-4 h-4 text-green-500" />}
              items={connections.accepted}
              empty="No hay conexiones aceptadas"
              onAction={handleActionConnection}
              onViewProperties={viewInmoPropertiesByConnection}
            />
            <ConnectionsSection
              title="Rechazadas / Canceladas"
              icon={<X className="w-4 h-4 text-red-500" />}
              items={connections.rejected}
              empty="No hay solicitudes rechazadas"
              onAction={handleActionConnection}
            />
          </motion.div>
        )}

        {subtab === 'explore' && (
          <motion.div key="explore" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm text-navy-light">
                      Explorá las inmobiliarias registradas en Pixel Inmobiliario
                    </p>
                    <p className="text-xs text-navy-light mt-0.5">
                      Mostrando {inmos.data.length} de {inmos.total} — Página {inmos.currentPage} de {inmos.lastPage}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Input
                      type="text"
                      placeholder="Buscar (en la página actual)..."
                      value={exploreSearch}
                      onChange={(e) => setExploreSearch(e.target.value)}
                      className="flex-1 sm:w-64"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={exportInmosCsv}
                      disabled={inmos.data.length === 0}
                      className="text-green-700 border-green-300 hover:bg-green-50"
                      title="Exportar esta página a CSV"
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline ml-1">CSV</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {inmos.data
                .filter((inmo) => {
                  if (!exploreSearch.trim()) return true
                  const q = exploreSearch.toLowerCase()
                  return (
                    inmo.realty_name?.toLowerCase().includes(q) ||
                    inmo.city?.toLowerCase().includes(q) ||
                    inmo.state?.toLowerCase().includes(q) ||
                    inmo.email?.toLowerCase().includes(q) ||
                    inmo.website?.toLowerCase().includes(q)
                  )
                })
                .map((inmo) => (
                  <InmoCard
                    key={inmo.id}
                    inmo={inmo}
                    onSendRequest={() => handleSendRequest(inmo)}
                    onViewProperties={() => viewInmoPropertiesOnPixel(inmo.id, inmo.realty_name)}
                  />
                ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setExplorePage((p) => Math.max(1, p - 1))}
                disabled={inmos.currentPage <= 1}
                className="text-navy border-navy/20"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </Button>
              <span className="text-xs text-navy-light">
                Página {inmos.currentPage} de {inmos.lastPage}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setExplorePage((p) => Math.min(inmos.lastPage, p + 1))}
                disabled={inmos.currentPage >= inmos.lastPage}
                className="text-navy border-navy/20"
              >
                Siguiente
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {subtab === 'properties' && (
          <motion.div key="properties" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-bold text-navy flex items-center gap-2">
                      <HomeIcon className="w-4 h-4" style={{ color: '#abd305' }} />
                      Propiedades en Pixel Inmobiliario
                    </h3>
                    <p className="text-xs text-navy-light mt-0.5">
                      Mostrando {properties.length} de {propertiesMeta.total} — Página {propertiesMeta.currentPage} de {propertiesMeta.lastPage}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fetchProperties(propertiesPage)}
                      disabled={propertiesLoading}
                      className="text-navy border-navy/20"
                    >
                      <RefreshCw className={cn('w-4 h-4', propertiesLoading && 'animate-spin')} />
                      <span className="hidden sm:inline ml-1">Refrescar</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleImportAllProperties}
                      disabled={importing || propertiesLoading || properties.length === 0}
                      style={{ backgroundColor: '#abd305', borderColor: '#abd305', color: '#FFFFFF' }}
                    >
                      {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      <span className="ml-1">Importar todas</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleImportProperties}
                      disabled={importing || selectedPropertyIds.size === 0}
                      className="text-green-700 border-green-300 hover:bg-green-50"
                    >
                      {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      <span className="ml-1">
                        Importar {selectedPropertyIds.size > 0 ? `(${selectedPropertyIds.size})` : 'selección'}
                      </span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRefreshMedia}
                      disabled={refreshingMedia || importing}
                      className="text-amber-700 border-amber-300 hover:bg-amber-50"
                      title="Vuelve a descargar fotos y videos de Pixel para las propiedades ya importadas que quedaron sin medios"
                    >
                      {refreshingMedia ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                      <span className="ml-1">Refrescar fotos/videos</span>
                    </Button>
                  </div>
                </div>

                {refreshMediaResult && (
                  <div className="mt-3 rounded-md border bg-amber-50/50 p-3 text-xs">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant="outline" className="text-amber-800 border-amber-300 bg-amber-100">
                        En Pixel: {refreshMediaResult.pixelTotal}
                      </Badge>
                      <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">
                        Locales: {refreshMediaResult.localMatched}
                      </Badge>
                      <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                        Actualizadas: {refreshMediaResult.updated}
                      </Badge>
                      {refreshMediaResult.notFound > 0 && (
                        <Badge variant="outline" className="text-gray-700 border-gray-300 bg-gray-50">
                          Sin match local: {refreshMediaResult.notFound}
                        </Badge>
                      )}
                      {refreshMediaResult.errors.length > 0 && (
                        <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50">
                          Errores: {refreshMediaResult.errors.length}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 text-navy-light">
                      Las propiedades actualizadas ahora muestran su foto principal y video (si lo tenían en Pixel).
                      Si una propiedad no tenía foto en Pixel, queda sin foto localmente — subila manualmente desde el editor.
                    </p>
                  </div>
                )}

                {importResult && (
                  <div className="mt-3 rounded-md border bg-soft/30 p-3 text-xs">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                        Importadas: {importResult.imported}
                      </Badge>
                      <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">
                        Omitidas: {importResult.skipped}
                      </Badge>
                      {importResult.errors.length > 0 && (
                        <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50">
                          Errores: {importResult.errors.length}
                        </Badge>
                      )}
                    </div>
                    {importResult.errors.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-navy-light">Ver detalles de errores</summary>
                        <ul className="mt-1 space-y-0.5">
                          {importResult.errors.slice(0, 10).map((e, i) => (
                            <li key={i} className="text-red-700">
                              ID {e.pixelId}: {e.error}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Filtrar en la página actual..."
                value={propertiesSearch}
                onChange={(e) => setPropertiesSearch(e.target.value)}
                className="flex-1"
              />
              {selectedPropertyIds.size > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedPropertyIds(new Set())}
                  className="text-navy-light"
                >
                  Limpiar selección
                </Button>
              )}
            </div>

            {propertiesLoading && properties.length === 0 ? (
              <Card className="border-2 border-dashed border-lavender">
                <CardContent className="pt-10 pb-10 text-center">
                  <Loader2 className="w-8 h-8 text-navy-light mx-auto mb-3 animate-spin" />
                  <p className="text-sm text-navy-light">Cargando propiedades de Pixel Inmobiliario...</p>
                </CardContent>
              </Card>
            ) : properties.length === 0 ? (
              <Card className="border-2 border-dashed border-lavender">
                <CardContent className="pt-10 pb-10 text-center">
                  <HomeIcon className="w-12 h-12 text-navy-light mx-auto mb-3" />
                  <p className="text-sm text-navy-light">No hay propiedades en tu cuenta de Pixel Inmobiliario</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {properties
                    .filter((p) => {
                      if (!propertiesSearch.trim()) return true
                      const q = propertiesSearch.toLowerCase()
                      return (
                        (p.title || '').toLowerCase().includes(q) ||
                        (p.code || '').toLowerCase().includes(q) ||
                        (p.ref_code || '').toLowerCase().includes(q) ||
                        (p.city || '').toLowerCase().includes(q) ||
                        (p.address || '').toLowerCase().includes(q)
                      )
                    })
                    .map((p) => (
                      <PixelPropertyCard
                        key={p.id}
                        property={p}
                        selected={selectedPropertyIds.has(p.id)}
                        onToggle={() => togglePropertySelection(p.id)}
                      />
                    ))}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fetchProperties(Math.max(1, propertiesPage - 1))}
                    disabled={propertiesPage <= 1 || propertiesLoading}
                    className="text-navy border-navy/20"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Anterior
                  </Button>
                  <span className="text-xs text-navy-light">
                    Página {propertiesMeta.currentPage} de {propertiesMeta.lastPage}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fetchProperties(Math.min(propertiesMeta.lastPage, propertiesPage + 1))}
                    disabled={propertiesPage >= propertiesMeta.lastPage || propertiesLoading}
                    className="text-navy border-navy/20"
                  >
                    Siguiente
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        )}

        {subtab === 'suggested' && (
          <motion.div key="suggested" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
            <p className="text-sm text-navy-light">Redes públicas de otras inmobiliarias a las que podrías unirte</p>
            {suggested.length === 0 ? (
              <Card className="border-2 border-dashed border-lavender">
                <CardContent className="pt-10 pb-10 text-center">
                  <Sparkles className="w-12 h-12 text-navy-light mx-auto mb-3" />
                  <p className="text-sm text-navy-light">No hay redes sugeridas disponibles en este momento</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {suggested.map((n) => (
                  <Card key={n.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-5">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-navy truncate">{n.title}</h3>
                          <p className="text-xs text-navy-light">Por: {n.creator}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] capitalize bg-purple-50 text-purple-700 border-purple-200">
                          sugerida
                        </Badge>
                      </div>
                      {n.description && (
                        <p className="text-sm text-navy-light line-clamp-2 mb-2">{n.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-navy-light mb-3">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {n.partners_count} socios
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {n.inmos_count} inmobiliarias
                        </span>
                      </div>
                      <p className="text-xs text-navy-light">
                        Para unirte, buscá a la inmobiliaria creadora en "Explorar Inmos" y envíale una solicitud de conexión a esta red.
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ============================================================
// Sub-components
// ============================================================

function LoginCard({
  email, password, onEmailChange, onPasswordChange, onSubmit, loading,
}: {
  email: string
  password: string
  onEmailChange: (v: string) => void
  onPasswordChange: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
  loading: boolean
}) {
  return (
    <Card className="border-2" style={{ borderColor: '#abd305' }}>
      <div className="h-1.5" style={{ backgroundColor: '#abd305' }} />
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: '#abd305' }}
          >
            <NetworkIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-navy">Pixel Inmobiliario CRM</h3>
            <p className="text-xs text-navy-light">Conectá tu cuenta para interactuar con la red</p>
          </div>
        </div>

        <Card className="bg-soft/30 border-lavender/30 mb-4">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-2 text-xs text-navy-light">
              <Info className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p>Al iniciar sesión, podrás:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-1">
                  <li>Ver y gestionar tus redes inter-agencias</li>
                  <li>Enviar y recibir solicitudes de conexión con otras inmobiliarias</li>
                  <li>Compartir propiedades y recibir propiedades compartidas</li>
                  <li>Explorar las {1425}+ inmobiliarias registradas en la red</li>
                </ul>
                <p className="text-[11px] mt-1">
                  Las credenciales se guardan cifradas en tu base de datos para renovar la sesión automáticamente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-navy-light block mb-1">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="info@tuinmobiliaria.com.ar"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium text-navy-light block mb-1">Contraseña</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full text-white"
            style={{ backgroundColor: '#abd305' }}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <LogIn className="w-4 h-4 mr-2" />
            )}
            {loading ? 'Conectando...' : 'Conectar con Pixel Inmobiliario'}
          </Button>
        </form>

        <div className="mt-4 pt-4 border-t border-lavender/30 text-center">
          <a
            href="https://pixelinmobiliario.com.ar/crm/panel/login"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
          >
            ¿No tenés cuenta? Creala en pixelinmobiliario.com.ar
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  )
}

function StatBox({
  label, value, icon, color,
}: {
  label: string
  value: number
  icon: React.ReactNode
  color: 'navy' | 'green' | 'amber' | 'red'
}) {
  const colors = {
    navy: 'bg-navy/5 text-navy border-navy/20',
    green: 'bg-green-50 text-green-700 border-green-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <div className={cn('border rounded-lg p-3 flex items-center gap-3', colors[color])}>
      <div className="opacity-80">{icon}</div>
      <div>
        <div className="text-xl font-bold leading-tight">{value}</div>
        <div className="text-[10px] uppercase tracking-wide opacity-70">{label}</div>
      </div>
    </div>
  )
}

function ActionCard({
  title, desc, icon, onClick,
}: {
  title: string
  desc: string
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="pt-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold/10 text-gold flex items-center justify-center flex-shrink-0 group-hover:bg-gold group-hover:text-white transition-colors">
            {icon}
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-navy text-sm">{title}</h4>
            <p className="text-xs text-navy-light mt-0.5 line-clamp-2">{desc}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ConnectionsSection({
  title, icon, items, empty, onAction, onViewProperties,
}: {
  title: string
  icon: React.ReactNode
  items: PixelConnection[]
  empty: string
  onAction: (id: number, action: 'accepted' | 'rejected' | 'cancelled') => void
  onViewProperties?: (conn: PixelConnection) => void
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {icon}
          {title} ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length === 0 ? (
          <p className="text-sm text-navy-light py-4 text-center">{empty}</p>
        ) : (
          <div className="space-y-2">
            {items.map((c) => (
              <ConnectionRow
                key={c.id}
                conn={c}
                onAction={onAction}
                onViewProperties={onViewProperties}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ConnectionRow({
  conn, onAction, onViewProperties,
}: {
  conn: PixelConnection
  onAction: (id: number, action: 'accepted' | 'rejected' | 'cancelled') => void
  onViewProperties?: (conn: PixelConnection) => void
}) {
  const isReceived = conn.type === 'received_request'
  return (
    <div className="border border-lavender/30 rounded-lg p-3 hover:bg-soft/30 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-3 min-w-0">
          {conn.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={conn.photo} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-soft flex items-center justify-center flex-shrink-0">
              <UserCircle className="w-6 h-6 text-navy-light" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-navy text-sm truncate">
              {conn.realty_name}
            </p>
            <p className="text-xs text-navy-light truncate">
              {conn.name} {conn.last_name} · {conn.city}, {conn.state}
            </p>
            <p className="text-xs text-navy-light truncate">
              Red: <span className="font-medium text-navy">{conn.crm_network_title}</span>
            </p>
            {conn.email && (
              <a
                href={`mailto:${conn.email}`}
                className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
              >
                <Mail className="w-3 h-3" />
                {conn.email}
              </a>
            )}
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] flex-shrink-0',
            isReceived
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-purple-50 text-purple-700 border-purple-200'
          )}
        >
          {isReceived ? 'Recibida' : 'Enviada'}
        </Badge>
      </div>

      {conn.creator_message && (
        <p className="text-xs text-navy-light bg-soft/50 rounded px-2 py-1 mb-2 italic">
          "{conn.creator_message}"
        </p>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[10px] text-navy-light">{conn.mapped_created_at}</p>
        <div className="flex gap-1.5 flex-wrap">
          {conn.status === 'pending' && (
            <>
              {isReceived && (
                <>
                  <Button
                    size="sm"
                    onClick={() => onAction(conn.inmo_connection_id, 'accepted')}
                    className="text-xs h-7 px-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Aceptar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAction(conn.inmo_connection_id, 'rejected')}
                    className="text-xs h-7 px-2 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Rechazar
                  </Button>
                </>
              )}
              {!isReceived && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAction(conn.inmo_connection_id, 'cancelled')}
                  className="text-xs h-7 px-2 text-amber-600 border-amber-200 hover:bg-amber-50"
                >
                  Cancelar solicitud
                </Button>
              )}
            </>
          )}
          {conn.status === 'accepted' && onViewProperties && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewProperties(conn)}
              className="text-xs h-7 px-2 text-navy border-navy/30 hover:bg-navy hover:text-white"
              title="Ver propiedades de esta inmobiliaria en Pixel Inmobiliario"
            >
              <HomeIcon className="w-3 h-3 mr-1" />
              Ver propiedades
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function InmoCard({
  inmo, onSendRequest, onViewProperties,
}: {
  inmo: PixelInmo
  onSendRequest: () => void
  onViewProperties: () => void
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-5">
        <div className="flex items-start gap-3 mb-3">
          {inmo.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={inmo.photo} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-soft flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-navy-light" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-navy text-sm truncate">{inmo.realty_name}</h3>
            <p className="text-xs text-navy-light truncate">
              {inmo.name} {inmo.last_name}
            </p>
            <p className="text-xs text-navy-light flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3" />
              {inmo.city}, {inmo.state}, {inmo.country}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-navy-light mb-3 flex-wrap">
          {inmo.email && (
            <a href={`mailto:${inmo.email}`} className="flex items-center gap-1 hover:text-navy">
              <Mail className="w-3 h-3" />
              {inmo.email}
            </a>
          )}
          {inmo.website && (
            <a
              href={inmo.website.startsWith('http') ? inmo.website : `https://${inmo.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-navy"
            >
              <Globe className="w-3 h-3" />
              {inmo.website}
            </a>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onSendRequest}
            className="flex-1 text-white bg-gold hover:bg-gold-dark text-xs"
          >
            <Send className="w-3 h-3 mr-1" />
            Conectar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onViewProperties}
            className="text-navy border-navy/30 hover:bg-navy hover:text-white text-xs"
            title="Ver propiedades de esta inmobiliaria en Pixel Inmobiliario"
          >
            <HomeIcon className="w-3 h-3 mr-1" />
            Propiedades
            <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// PixelPropertyCard — shows one Pixel CRM property with import checkbox
// ============================================================

function pickFirst<T = any>(obj: any, keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj?.[k] !== undefined && obj?.[k] !== null && obj?.[k] !== '') {
      return obj[k] as T
    }
  }
  return undefined
}

function extractImageUrl(p: PixelProperty): string | null {
  const raw = pickFirst<any>(p, ['images', 'photos', 'gallery', 'fotos', 'imagenes'])
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === 'string' && /^https?:\/\//.test(item)) return item
      if (item && typeof item === 'object') {
        const u = pickFirst<string>(item, ['url', 'full_url', 'src', 'path', 'large', 'medium', 'original'])
        if (u && /^https?:\/\//.test(u)) return u
      }
    }
  }
  const main = pickFirst<string>(p, ['main_image', 'mainImage', 'cover', 'thumbnail', 'thumb'])
  if (main && /^https?:\/\//.test(main)) return main
  return null
}

function PixelPropertyCard({
  property,
  selected,
  onToggle,
}: {
  property: PixelProperty
  selected: boolean
  onToggle: () => void
}) {
  const title = (property.title || '').trim() || `Propiedad #${property.id}`
  const code = pickFirst<string>(property, ['code', 'ref_code', 'reference', 'codigo']) || `PIXEL-${property.id}`
  const type = pickFirst<string>(property, ['property_type', 'type', 'ad_type', 'tipo_inmueble']) || ''
  const operation = pickFirst<string>(property, ['operation_type', 'operation', 'operacion', 'ad_operation']) || ''
  const price = pickFirst(property, ['price', 'precio'])
  const currency = pickFirst<string>(property, ['currency', 'moneda'])
  const city = pickFirst<string>(property, ['city', 'ciudad', 'localidad']) || ''
  const state = pickFirst<string>(property, ['state', 'provincia', 'estado']) || ''
  const address = pickFirst<string>(property, ['address', 'street', 'direccion', 'calle']) || ''
  const bedrooms = pickFirst<number>(property, ['bedrooms', 'dormitorios', 'habitaciones'])
  const bathrooms = pickFirst<number>(property, ['bathrooms', 'banos', 'banios'])
  const area = pickFirst<number>(property, ['total_area', 'surface_total', 'area_total', 'area'])
  const imgUrl = extractImageUrl(property)

  const formattedPrice = (() => {
    if (price === null || price === undefined || price === '') return 'Consultar'
    const cur = String(currency || '').toUpperCase() === 'ARS' || String(currency || '') === '$' ? 'ARS' : 'USD'
    const n = parseFloat(String(price).replace(/[^0-9.-]/g, ''))
    if (isNaN(n) || n === 0) return 'Consultar'
    return `${cur} ${n.toLocaleString('es-AR')}`
  })()

  const opLabel = (() => {
    const s = String(operation || '').toLowerCase()
    if (s.includes('alquil') && (s.includes('temp') || s.includes('vacac'))) return 'Temporario'
    if (s.includes('alquil')) return 'Alquiler'
    if (s.includes('vent')) return 'Venta'
    return operation || ''
  })()

  return (
    <Card
      className={cn(
        'transition-all cursor-pointer hover:shadow-md',
        selected ? 'border-2 ring-2 ring-[#abd305]/40' : 'border'
      )}
      onClick={onToggle}
    >
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          {/* Thumbnail */}
          <div className="w-20 h-20 rounded-md overflow-hidden bg-soft/40 flex-shrink-0 flex items-center justify-center">
            {imgUrl ? (
              <img src={imgUrl} alt={title} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <HomeIcon className="w-8 h-8 text-navy-light/50" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-navy text-sm leading-tight line-clamp-2">{title}</h3>
              <input
                type="checkbox"
                checked={selected}
                onChange={onToggle}
                onClick={(e) => e.stopPropagation()}
                className="mt-0.5 w-4 h-4 accent-[#abd305] flex-shrink-0"
              />
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge variant="outline" className="text-[10px] bg-navy/5">
                {code}
              </Badge>
              {type && (
                <Badge variant="outline" className="text-[10px] capitalize bg-blue-50 text-blue-700 border-blue-200">
                  {String(type).toLowerCase()}
                </Badge>
              )}
              {opLabel && (
                <Badge variant="outline" className="text-[10px] capitalize bg-purple-50 text-purple-700 border-purple-200">
                  {opLabel.toLowerCase()}
                </Badge>
              )}
            </div>
            <p className="text-sm font-semibold text-navy mt-1.5">{formattedPrice}</p>
            <p className="text-xs text-navy-light mt-1 line-clamp-1">
              {address && <>{address} · </>}
              {[city, state].filter(Boolean).join(', ') || 'Sin ubicación'}
            </p>
            {(bedrooms !== undefined || bathrooms !== undefined || area !== undefined) && (
              <p className="text-xs text-navy-light mt-0.5">
                {bedrooms !== undefined && <>{bedrooms} amb.</>}
                {bedrooms !== undefined && bathrooms !== undefined && <> · </>}
                {bathrooms !== undefined && <>{bathrooms} baños</>}
                {(bedrooms !== undefined || bathrooms !== undefined) && area !== undefined && <> · </>}
                {area !== undefined && <>{area} m²</>}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
