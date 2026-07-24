'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  ShoppingCart, CheckCircle2, Link2, AlertTriangle,
  ExternalLink, Loader2, RefreshCw, Trash2, Building2,
  Settings, Info, Save, Eye, EyeOff, Key, Stethoscope,
  ShieldCheck, CreditCard, TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface MLListing {
  id: string
  propertyId: string
  mlItemId: string
  mlPermalink: string
  status: string
  errorMessage: string
  lastSynced: string | null
  createdAt: string
  property?: {
    id: string
    title: string
    code: string
    operation: string
  }
}

interface DiagnosticsData {
  user?: {
    id: number
    nickname: string
    country_id: string
    site_status: string
    seller_reputation?: any
    status?: any
  }
  tokenInfo?: {
    scope: string
    expiresIn: number
    updatedAt: string
    hasRefreshToken: boolean
  }
  availableListingTypes?: Record<string, any>
  postingLimits?: any
  mercadopagoAccount?: any
  activeListings?: {
    total: number
    results: string[]
  }
  testValidation?: any
  error?: string
}

export default function AdminMercadoLibre() {
  const [configured, setConfigured] = useState(false)
  const [connected, setConnected] = useState(false)
  const [authUrl, setAuthUrl] = useState('')
  const [message, setMessage] = useState('')
  const [mlUserId, setMlUserId] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [listings, setListings] = useState<MLListing[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [mlError, setMlError] = useState('')

  // Diagnostics
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null)
  const [diagnosing, setDiagnosing] = useState(false)

  // Settings form
  const [appId, setAppId] = useState('')
  const [appSecret, setAppSecret] = useState('')
  const [redirectUri, setRedirectUri] = useState('https://fzacaria.com.ar/api/mercadolibre/auth/callback')
  const [showSecret, setShowSecret] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/mercadolibre/auth')
      if (res.ok) {
        const data = await res.json()
        setConfigured(data.configured || false)
        setConnected(data.connected || false)
        if (data.authUrl) setAuthUrl(data.authUrl)
        if (data.message) setMessage(data.message)
        if (data.mlUserId) setMlUserId(data.mlUserId)
        if (data.expiresAt) setExpiresAt(data.expiresAt)
      }
    } catch {}

    try {
      const res = await fetch('/api/mercadolibre/status')
      if (res.ok) {
        const data = await res.json()
        setListings(data.listings || [])
      }
    } catch {}

    setLoading(false)
  }, [])

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/mercadolibre/settings')
      if (res.ok) {
        const data = await res.json()
        setAppId(data.appId || '')
        setRedirectUri(data.redirectUri || 'https://fzacaria.com.ar/api/mercadolibre/auth/callback')
        if (data.appSecretSet && !data.appId) {
          setAppSecret('')
        } else if (!data.appSecretSet) {
          setAppSecret('')
        }
      }
    } catch {}
    setSettingsLoaded(true)
  }, [])

  useEffect(() => {
    fetchStatus()
    fetchSettings()
  }, [fetchStatus, fetchSettings])

  // Check for ML callback params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('ml_connected')) {
      toast.success('¡Mercado Libre conectado!')
      window.history.replaceState({}, '', '/admin/mercadolibre')
      fetchStatus()
    }
    if (params.get('ml_error')) {
      const errMsg = params.get('ml_error') || 'Error desconocido'
      setMlError(errMsg)
      toast.error(`Error ML: ${errMsg}`)
      window.history.replaceState({}, '', '/admin/mercadolibre')
    }
  }, [fetchStatus])

  async function handleRunDiagnostics() {
    if (!connected) {
      toast.error('Conectá tu cuenta de Mercado Libre primero')
      return
    }
    setDiagnosing(true)
    try {
      const res = await fetch('/api/mercadolibre/diagnose')
      if (res.ok) {
        const data = await res.json()
        setDiagnostics(data)
        toast.success('Diagnóstico completado')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al ejecutar diagnóstico')
      }
    } catch {
      toast.error('Error de conexión al ejecutar diagnóstico')
    } finally {
      setDiagnosing(false)
    }
  }

  async function handleSaveSettings() {
    if (!appId.trim() || !appSecret.trim()) {
      toast.error('App ID y App Secret son requeridos')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/mercadolibre/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: appId.trim(),
          appSecret: appSecret.trim(),
          redirectUri: redirectUri.trim(),
        }),
      })
      if (res.ok) {
        toast.success('Credenciales guardadas. Conectá tu cuenta de ML para empezar.')
        setAppSecret('')
        fetchStatus()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al guardar')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteSettings() {
    if (!confirm('¿Eliminar las credenciales de Mercado Libre? Se desconectará la cuenta.')) return
    try {
      const res = await fetch('/api/mercadolibre/settings', { method: 'DELETE' })
      if (res.ok) {
        toast.success('Configuración eliminada')
        setAppId('')
        setAppSecret('')
        fetchStatus()
      }
    } catch {
      toast.error('Error al eliminar')
    }
  }

  async function handleUnpublish(propertyId: string) {
    try {
      const res = await fetch('/api/mercadolibre/publish', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      })
      if (res.ok) {
        toast.success('Publicación eliminada de Mercado Libre')
        fetchStatus()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al eliminar de ML')
      }
    } catch {
      toast.error('Error de conexión')
    }
  }

  async function handleSyncListing(propertyId: string) {
    try {
      const res = await fetch('/api/mercadolibre/publish', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      })
      const data = await res.json()
      if (res.ok) {
        if (data.descWarning) {
          toast.success('Datos actualizados en ML (la descripción tuvo un error, pero el resto se actualizó)', { duration: 8000 })
        } else {
          toast.success('¡Descripción y datos sincronizados con Mercado Libre!')
        }
        fetchStatus()
      } else if (data.needsAuth) {
        toast.error('Conectá tu cuenta de Mercado Libre primero')
      } else {
        toast.error(data.error || data.details || 'Error al sincronizar con ML', { duration: 8000 })
      }
    } catch {
      toast.error('Error de conexión')
    }
  }

  async function handleSyncAll() {
    setSyncing(true)
    try {
      // Push changes to all active listings first
      const activeListings = listings.filter(l => l.status === 'active' && l.mlItemId)
      for (const listing of activeListings) {
        try {
          await fetch('/api/mercadolibre/publish', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ propertyId: listing.propertyId }),
          })
        } catch {
          // Continue with next listing even if one fails
        }
      }
      await fetchStatus()
      toast.success(`Sincronizados ${activeListings.length} avisos con Mercado Libre`)
    } catch {
      toast.error('Error al sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  const statusLabels: Record<string, { label: string; color: string }> = {
    active: { label: 'Activa', color: 'bg-green-500' },
    pending: { label: 'Pendiente', color: 'bg-amber-500' },
    paused: { label: 'Pausada', color: 'bg-blue-500' },
    closed: { label: 'Cerrada', color: 'bg-gray-500' },
    error: { label: 'Error', color: 'bg-red-500' },
  }

  // Helper to render listing types from diagnostics
  const renderListingTypes = () => {
    if (!diagnostics?.availableListingTypes) return null
    const cats = diagnostics.availableListingTypes
    const catNames: Record<string, string> = {
      'MLA401686': 'Deptos Venta',
      'MLA1473': 'Deptos Alquiler',
      'MLA50279': 'Deptos Temporario',
      'MLA401685': 'Casas Venta',
    }

    return Object.entries(cats).map(([catId, data]: [string, any]) => {
      const viaMe = data?.viaMe
      const viaUserId = data?.viaUserId
      const hasTypes = Array.isArray(viaMe) && viaMe.length > 0
      const hasTypes2 = Array.isArray(viaUserId) && viaUserId.length > 0

      return (
        <div key={catId} className="p-3 bg-soft rounded-lg">
          <p className="font-medium text-navy text-sm mb-1">{catNames[catId] || catId}</p>
          <p className="text-xs text-navy-light font-mono mb-1">{catId}</p>
          {hasTypes ? (
            <div className="space-y-1">
              {viaMe.map((lt: any) => (
                <div key={lt.listing_type_id} className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="font-mono">{lt.listing_type_id}</span>
                  <span className="text-navy-light">{lt.name || ''}</span>
                </div>
              ))}
            </div>
          ) : hasTypes2 ? (
            <div className="space-y-1">
              {viaUserId.map((lt: any) => (
                <div key={lt.listing_type_id} className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="font-mono">{lt.listing_type_id}</span>
                  <span className="text-navy-light">{lt.name || ''}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-red-600 font-medium">Sin tipos disponibles</span>
            </div>
          )}
        </div>
      )
    })
  }

  // Helper to render validation results
  const renderValidationResults = () => {
    if (!diagnostics?.testValidation) return null
    const tv = diagnostics.testValidation

    return (
      <div className="space-y-2">
        {['free', 'silver', 'gold_special'].map((lt) => {
          const result = tv[lt]
          if (!result) return null
          const ok = result.ok
          const causes = result.data?.cause || []

          return (
            <div key={lt} className={`p-3 rounded-lg text-sm ${ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="font-mono font-medium">{lt}</span>
                <span className={ok ? 'text-green-700' : 'text-red-700'}>
                  {ok ? '✓ Válido' : `✗ Error (${result.status})`}
                </span>
              </div>
              {!ok && causes.length > 0 && (
                <div className="mt-1 ml-4 text-xs text-red-600 space-y-0.5">
                  {causes.map((c: any, i: number) => (
                    <p key={i}>{c.message || c.code || JSON.stringify(c)}</p>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-navy border-t-gold rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-navy">Mercado Libre</h2>
          <p className="text-navy-light mt-1">Gestioná la conexión y publicaciones en Mercado Libre</p>
        </div>
        <div className="flex items-center gap-2">
          {connected && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunDiagnostics}
              disabled={diagnosing}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <Stethoscope className={`w-4 h-4 mr-1 ${diagnosing ? 'animate-pulse' : ''}`} />
              Diagnosticar
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncAll}
            disabled={syncing}
            className="text-navy border-navy/20"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
        </div>
      </div>

      {/* Credentials Configuration Card - ALWAYS VISIBLE */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="w-5 h-5" />
            Credenciales de API
            {configured && (
              <Badge className="bg-green-600 text-white border-0 text-xs ml-2">Configurado</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-semibold">¿Cómo obtener las credenciales?</p>
              <ol className="list-decimal list-inside mt-1 space-y-0.5 text-xs">
                <li>Ingresá a <a href="https://developers.mercadolibre.com.ar/" target="_blank" rel="noopener noreferrer" className="underline font-medium">developers.mercadolibre.com.ar</a> con tu cuenta de ML</li>
                <li>Andá a &quot;Mis Aplicaciones&quot; y creá una nueva app</li>
                <li>En &quot;Redirect URI&quot; poné: <code className="bg-white px-1 rounded">{redirectUri}</code></li>
                <li>Seleccioná los scopes: <code className="bg-white px-1 rounded">read, write</code></li>
                <li>Copiá el <strong>App ID</strong> (Client ID) y <strong>Secret Key</strong> (Client Secret)</li>
              </ol>
            </div>
          </div>

          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium text-navy mb-1.5 block">App ID (Client ID)</label>
              <Input
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="Ej: 1234567890123"
                className="border-navy/20 focus:border-gold font-mono"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-navy mb-1.5 block">Secret Key (Client Secret)</label>
              <div className="relative">
                <Input
                  type={showSecret ? 'text' : 'password'}
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                  placeholder={configured ? '•••••••• (ingresá nuevo valor para cambiar)' : 'Ej: abc123XYZ789'}
                  className="border-navy/20 focus:border-gold font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-light hover:text-navy"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-navy mb-1.5 block">Redirect URI</label>
              <Input
                value={redirectUri}
                onChange={(e) => setRedirectUri(e.target.value)}
                className="border-navy/20 focus:border-gold font-mono text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={handleSaveSettings}
              disabled={saving || !appId.trim() || !appSecret.trim()}
              className="bg-gold hover:bg-gold-dark text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Guardar Credenciales
            </Button>
            {configured && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteSettings}
                className="text-red-500 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Eliminar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ML Error Banner */}
      {mlError && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-800">Error al conectar con Mercado Libre</h4>
              <p className="text-sm text-red-700 mt-1 break-all">{mlError}</p>
              <Button variant="outline" size="sm" className="mt-3 text-red-600 border-red-300" onClick={() => setMlError('')}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Connection Status */}
      <Card className={`border-2 ${!configured ? 'border-amber-400' : connected ? 'border-green-400' : 'border-blue-400'}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="w-5 h-5" />
            Estado de Conexión
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!configured ? (
            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-800">Credenciales no configuradas</h4>
                <p className="text-sm text-amber-700 mt-1">Ingresá tu App ID y Secret Key en el formulario de arriba para empezar.</p>
              </div>
            </div>
          ) : connected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-green-800">Cuenta conectada</h4>
                  <p className="text-sm text-green-700 mt-0.5">Ya podés publicar propiedades en Mercado Libre desde el panel de propiedades.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {mlUserId && (
                  <div className="bg-soft rounded-lg p-3">
                    <p className="text-navy-light text-xs">Usuario ML</p>
                    <p className="font-mono text-navy">{mlUserId}</p>
                  </div>
                )}
                {expiresAt && (
                  <div className="bg-soft rounded-lg p-3">
                    <p className="text-navy-light text-xs">Token expira</p>
                    <p className="font-mono text-navy">{new Date(expiresAt).toLocaleString('es-AR')}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Link2 className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-800">Credenciales guardadas</h4>
                  <p className="text-sm text-blue-700 mt-1">Falta conectar tu cuenta de Mercado Libre. Hacé clic en el botón para autorizar la aplicación.</p>
                </div>
              </div>
              {authUrl ? (
                <a
                  href={authUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors h-11 px-8 bg-[#ffe600] hover:bg-[#ffd900] text-[#333]"
                  target="_self"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Conectar con Mercado Libre
                </a>
              ) : (
                <Button
                  className="bg-[#ffe600] hover:bg-[#ffd900] text-[#333] h-11"
                  onClick={fetchStatus}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Conectar con Mercado Libre
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diagnostics Card */}
      {connected && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="w-5 h-5" />
              Diagnóstico de Cuenta
              {!diagnostics && !diagnosing && (
                <span className="text-xs text-navy-light font-normal ml-2">
                  Hacé clic en &quot;Diagnosticar&quot; para verificar el estado
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {diagnosing ? (
              <div className="flex items-center gap-3 py-8 justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gold" />
                <span className="text-navy-light">Ejecutando diagnóstico...</span>
              </div>
            ) : diagnostics ? (
              <div className="space-y-4">
                {/* Account Status */}
                {diagnostics.user && (
                  <div>
                    <h4 className="font-medium text-navy text-sm mb-2 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      Estado de la Cuenta
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="bg-soft rounded-lg p-2">
                        <p className="text-navy-light text-xs">ID</p>
                        <p className="font-mono text-navy text-sm">{diagnostics.user.id}</p>
                      </div>
                      <div className="bg-soft rounded-lg p-2">
                        <p className="text-navy-light text-xs">Nickname</p>
                        <p className="text-navy text-sm">{diagnostics.user.nickname}</p>
                      </div>
                      <div className="bg-soft rounded-lg p-2">
                        <p className="text-navy-light text-xs">Site Status</p>
                        <p className="text-navy text-sm">{diagnostics.user.site_status || '—'}</p>
                      </div>
                      <div className="bg-soft rounded-lg p-2">
                        <p className="text-navy-light text-xs">Reputación Vendedor</p>
                        <p className="text-navy text-sm">
                          {diagnostics.user.seller_reputation?.power_seller_status || 'Sin reputación'}
                        </p>
                      </div>
                    </div>
                    {diagnostics.user.seller_reputation?.level_id && (
                      <p className="text-xs text-navy-light mt-1">
                        Nivel: {diagnostics.user.seller_reputation.level_id} | 
                        Transacciones: {diagnostics.user.seller_reputation?.transactions?.total || 0}
                      </p>
                    )}
                  </div>
                )}

                {/* Token Info */}
                {diagnostics.tokenInfo && (
                  <div>
                    <h4 className="font-medium text-navy text-sm mb-2 flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      Token / Permisos
                    </h4>
                    <div className="bg-soft rounded-lg p-3">
                      <p className="text-xs text-navy-light mb-1">Scopes autorizados:</p>
                      <div className="flex flex-wrap gap-1">
                        {diagnostics.tokenInfo.scope?.split(/[\s,]+/).map((s: string) => (
                          <Badge key={s} variant="outline" className="text-xs font-mono">
                            {s}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-navy-light mt-2">
                        Refresh token: {diagnostics.tokenInfo.hasRefreshToken ? '✓ Sí' : '✗ No'}
                      </p>
                    </div>
                  </div>
                )}

                {/* MercadoPago Account */}
                <div>
                  <h4 className="font-medium text-navy text-sm mb-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    MercadoPago
                  </h4>
                  {diagnostics.mercadopagoAccount && !diagnostics.mercadopagoAccount.error ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-800 font-medium">✓ Cuenta de MercadoPago vinculada</p>
                      {diagnostics.mercadopagoAccount.id && (
                        <p className="text-xs text-green-700 mt-1">ID: {diagnostics.mercadopagoAccount.id}</p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-800 font-medium">✗ Sin cuenta de MercadoPago vinculada</p>
                      <p className="text-xs text-red-700 mt-1">
                        Necesitás vincular una cuenta de MercadoPago para poder publicar con tipos de publicación pagos (silver, gold, etc.).
                        Sin MercadoPago, solo podés usar el tipo &quot;free&quot; si tenés quota disponible.
                      </p>
                      <a
                        href="https://www.mercadopago.com.ar/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 underline"
                      >
                        Ir a MercadoPago <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Available Listing Types */}
                <div>
                  <h4 className="font-medium text-navy text-sm mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Tipos de Publicación Disponibles
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {renderListingTypes()}
                  </div>
                </div>

                {/* Active Listings */}
                {diagnostics.activeListings && (
                  <div>
                    <h4 className="font-medium text-navy text-sm mb-2">Publicaciones Activas</h4>
                    <div className="bg-soft rounded-lg p-3">
                      <p className="text-navy text-lg font-bold">{diagnostics.activeListings.total}</p>
                      <p className="text-xs text-navy-light">publicaciones activas en Mercado Libre</p>
                    </div>
                  </div>
                )}

                {/* Test Validation Results */}
                {diagnostics.testValidation && (
                  <div>
                    <h4 className="font-medium text-navy text-sm mb-2">Validación de Prueba</h4>
                    <p className="text-xs text-navy-light mb-2">
                      Se intentó validar una publicación de prueba con cada tipo de listing:
                    </p>
                    {renderValidationResults()}
                  </div>
                )}

                {/* Quota Error Help */}
                {(diagnostics.testValidation && !diagnostics.testValidation.free?.ok) && (
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
                    <h4 className="font-semibold text-amber-800 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Sin Quota Disponible
                    </h4>
                    <div className="text-sm text-amber-700 mt-2 space-y-2">
                      <p>Tu cuenta de Mercado Libre no tiene quota disponible para publicar propiedades. Esto puede deberse a:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li><strong>Quota mensual agotada:</strong> Las cuentas gratuitas tienen un límite mensual de publicaciones gratis. Esperá al próximo mes o usá un tipo de publicación pago.</li>
                        <li><strong>Sin MercadoPago configurado:</strong> Para publicar con tipos pagos (silver, gold), necesitás tener una cuenta de MercadoPago vinculada a tu cuenta de ML.</li>
                        <li><strong>Cuenta no verificada:</strong> Es posible que tu cuenta necesite verificación de identidad para publicar clasificados.</li>
                        <li><strong>Aplicación sin permisos:</strong> Tu app de ML en Developers necesita tener el scope &quot;write&quot; habilitado.</li>
                      </ol>
                      <div className="mt-3 space-y-1">
                        <a
                          href="https://www.mercadolibre.com.ar/ventas/publicar"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 underline"
                        >
                          Ir a Publicar en ML (verificar estado) <ExternalLink className="w-3 h-3" />
                        </a>
                        <br />
                        <a
                          href="https://www.mercadopago.com.ar/hub/app"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 underline"
                        >
                          Configurar MercadoPago <ExternalLink className="w-3 h-3" />
                        </a>
                        <br />
                        <a
                          href="https://developers.mercadolibre.com.ar/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 underline"
                        >
                          Verificar permisos de la App <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Raw Diagnostics (collapsible) */}
                <details className="mt-2">
                  <summary className="text-xs text-navy-light cursor-pointer hover:text-navy">
                    Ver datos completos del diagnóstico (JSON)
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-100 rounded-lg text-xs overflow-auto max-h-64 font-mono">
                    {JSON.stringify(diagnostics, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <div className="text-center py-6">
                <Stethoscope className="w-8 h-8 text-lavender mx-auto mb-3" />
                <p className="text-navy-light text-sm">
                  Hacé clic en &quot;Diagnosticar&quot; arriba para verificar el estado de tu cuenta y los tipos de publicación disponibles.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Published Listings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="w-5 h-5" />
            Publicaciones en Mercado Libre
            {listings.length > 0 && (
              <Badge variant="outline" className="ml-auto text-xs">{listings.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {listings.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-10 h-10 text-lavender mx-auto mb-3" />
              <p className="text-navy-light text-sm">
                {!configured
                  ? 'Configurá las credenciales para empezar a publicar'
                  : !connected
                    ? 'Conectá tu cuenta de Mercado Libre para empezar a publicar'
                    : 'No hay propiedades publicadas en Mercado Libre'
                }
              </p>
              {configured && connected && (
                <p className="text-navy-light text-xs mt-2">
                  Andá a <a href="/admin/propiedades" className="text-gold underline">Propiedades</a> y hacé clic en &quot;ML&quot; para publicar
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {listings.map((listing) => {
                const statusInfo = statusLabels[listing.status] || statusLabels.error
                return (
                  <div key={listing.id} className="flex items-center justify-between p-3 bg-soft rounded-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusInfo.color}`} />
                      <div className="min-w-0">
                        <p className="font-medium text-navy text-sm truncate">
                          {listing.property?.title || `Propiedad ${listing.propertyId}`}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-navy-light">
                          <span className="font-mono">{listing.mlItemId || 'Sin ID'}</span>
                          <span>•</span>
                          <span>{statusInfo.label}</span>
                          {listing.lastSynced && (
                            <>
                              <span>•</span>
                              <span>Sinc: {new Date(listing.lastSynced).toLocaleString('es-AR')}</span>
                            </>
                          )}
                        </div>
                        {listing.errorMessage && (
                          <p className="text-xs text-red-500 mt-1">{listing.errorMessage}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {listing.mlPermalink && (
                        <a
                          href={listing.mlPermalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-8 w-8 flex items-center justify-center rounded-md bg-green-100 text-green-700 hover:bg-green-200"
                          title="Ver en Mercado Libre"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      {listing.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSyncListing(listing.propertyId)}
                          className="h-8 w-8 text-[#ffe600] hover:bg-[#ffe600]/10 hover:text-[#ffe600]"
                          title="Sincronizar cambios (descripción, precio, atributos, fotos)"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleUnpublish(listing.propertyId)}
                        className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                        title="Eliminar publicación de ML"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-navy-light space-y-2">
              <p><strong className="text-navy">¿Cómo funciona?</strong> Marcá una propiedad con el botón &quot;ML&quot; en la página de Propiedades para publicarla automáticamente en Mercado Libre. La publicación incluirá todos los datos de la propiedad, fotos, y datos de contacto de la inmobiliaria.</p>
              <p>Las propiedades se publican como avisos clasificados de inmobiliaria con el formato requerido por Mercado Libre (título, precio, ubicación, atributos, fotos).</p>
              <p><strong className="text-navy">Sincronización:</strong> Cuando edites una propiedad en tu sitio, hacé clic en el botón <RefreshCw className="w-3 h-3 inline" /> para empujar los cambios (descripción, precio, atributos, fotos) a Mercado Libre. También podés usar &quot;Sincronizar todos&quot; arriba para actualizar todos los avisos activos de una vez.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
